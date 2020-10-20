const { events, Job } = require("brigadier");
const checkRunImage = "brigadecore/brigade-github-check-run:latest"

events.on("check_suite:requested", updateSite)
events.on("pull_request:opened", createNS)
events.on("pull_request:reopened", createNS)
events.on("pull_request:closed", cleanupResources)


function createNS(e, p) {
  let prbranch = JSON.parse(e.payload).pull_request.head.ref

  var installNS = new Job("install-ns", "lachlanevenson/k8s-kubectl")
  installNS.tasks = [
    "kubectl create namespace pr-${PR_BRANCH}"
  ]
  installNS.env = {
    PR_BRANCH: prbranch
  }

  // This will create the review site
  const installChart = new Job("install-chart", "lachlanevenson/k8s-helm")
  installChart.tasks = [
    'apk add git',
    'git clone https://github.com/gctools-outilsgc/gcconnex.git',
    'helm install test ./gcconnex/.chart/collab/ --namespace pr-${PR_BRANCH} \
    --set url="https://pr-${PR_BRANCH}.test.phanoix.com/" \
    --set image.tag="${PR_BRANCH}"'
  ]
  installChart.env = {
    PR_BRANCH: prbranch
  }

  installNS.run().then(
    () => installChart.run()
  )
}

function cleanupResources(e, p) {
  // delete the namespace for the PR site
  var cleanup = new Job("cleanup", "lachlanevenson/k8s-kubectl")
  cleanup.tasks = [
    "kubectl delete namespace pr-${PR_BRANCH}"
  ]
  let prbranch = JSON.parse(e.payload).pull_request.head.ref
  cleanup.env = {
    PR_BRANCH: prbranch
  }

  cleanup.run()
}

function updateSite(e, p) {
  console.log("update requested")
  console.log(e.payload)

  let payload = JSON.parse(e.payload).body

  if (!payload.check_suite){
    console.log("Malformed payload JSON")
    return 0
  }

  let prbranch = payload.check_suite.head_branch
  

  // Common configuration
  const env = {
    CHECK_PAYLOAD: e.payload,
    CHECK_NAME: "Review Site",
    CHECK_TITLE: "Testing https://pr-"+prbranch+".test.phanoix.com/",
  }
  
  // This will update the review site
  const installChart = new Job("install-chart", "lachlanevenson/k8s-helm")
  installChart.tasks = [
    'apk add git',
    'git clone https://github.com/gctools-outilsgc/gcconnex.git',
    'echo $(kubectl get secret --namespace pr-${PR_BRANCH} test-collab-env -o jsonpath="{.data.db-password}" | base64 --decode)',
    'helm upgrade test ./gcconnex/.chart/collab/ --namespace pr-${PR_BRANCH} --reuse-values \
    --set mariadb.auth.password=$(kubectl get secret --namespace pr-${PR_BRANCH} test-collab-env -o jsonpath="{.data.db-password}" | base64 --decode) \
    --set image.tag="${PR_BRANCH}"'
  ]
  installChart.env = {
    PR_BRANCH: prbranch,
    PR_BRANCH: payload.check_suite.head_branch
  }

  // stage.
  const start = new Job("start-run", checkRunImage)
  start.imageForcePull = true
  start.env = env
  start.env.CHECK_SUMMARY = "Beginning test run"

  const end = new Job("end-run", checkRunImage)
  end.imageForcePull = true
  end.env = env

  // Now we run the jobs in order:
  // - Notify GitHub of start
  // - Run the test
  // - Notify GitHub of completion
  //
  // On error, we catch the error and notify GitHub of a failure.
  start.run().then(() => {
    return installChart.run()
  }).then( (result) => {
    end.env.CHECK_CONCLUSION = "success"
    end.env.CHECK_SUMMARY = "Build completed"
    end.env.CHECK_TEXT = result.toString()
    return end.run()
  }).catch( (err) => {
    // In this case, we mark the ending failed.
    end.env.CHECK_CONCLUSION = "failure"
    end.env.CHECK_SUMMARY = "Build failed"
    end.env.CHECK_TEXT = `Error: ${ err }`
    return end.run()
  })
}
