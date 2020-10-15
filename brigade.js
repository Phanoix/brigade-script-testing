const { events, Job } = require("brigadier");
const checkRunImage = "brigadecore/brigade-github-check-run:latest"

events.on("check_suite:requested", updateSite)
events.on("pull_request:opened", createNS)
events.on("pull_request:reopened", createNS)
events.on("pull_request:closed", cleanupResources)


function createNS(e, p) {
  let prnum = ""+JSON.parse(e.payload).number

  var installNS = new Job("installNS", "lachlanevenson/k8s-kubectl")
  installNS.tasks = [
    "kubectl create namespace pr-${PR_NUMBER}"
  ]
  installNS.env = {
    PR_NUMBER: prnum
  }

  installNS.run().then(() => {
    installChart.run()
  })
}

function cleanupResources(e, p) {
  // delete the namespace for the PR site
  var cleanup = new Job("cleanup", "lachlanevenson/k8s-kubectl")
  cleanup.tasks = [
    "kubectl delete namespace pr-${PR_NUMBER}"
  ]
  let prnum = ""+JSON.parse(e.payload).number
  cleanup.env = {
    PR_NUMBER: prnum
  }

  cleanup.run()
}

function updateSite(e, p) {
  console.log("update requested")

  let payload = JSON.parse(e.payload)

  if (!payload.check_suite || !payload.check_suite.pull_requests)
    return 0

  let prnum = JSON.parse(payload.check_suite.pull_requests[0]).number

  if (!prnum)
    return 0
  
  // Common configuration
  const env = {
    CHECK_PAYLOAD: e.payload,
    CHECK_NAME: "Review Site",
    CHECK_TITLE: "Testing https://pr-"+prnum+".test.phanoix.com/",
  }
  
  // This will create or update the review site
  const installChart = new Job("installChart", "lachlanevenson/k8s-helm")
  installChart.tasks = [
    'apk add git',
    'git clone https://github.com/gctools-outilsgc/gcconnex.git',
    'helm install test ./gcconnex/.chart/collab/ --namespace pr-${PR_NUMBER} \
    --set url="https://pr-${PR_NUMBER}.test.phanoix.com/" \
    --set image.tag="${PR_BRANCH}"'
  ]
  installChart.env = {
    PR_NUMBER: prnum,
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

