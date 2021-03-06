const { events, Job } = require("brigadier");
const checkRunImage = "brigadecore/brigade-github-check-run:latest"

events.on("check_suite:requested", updateSite)
events.on("pull_request:opened", createNS)
events.on("pull_request:reopened", createNS)
events.on("pull_request:closed", cleanupResources)


function createBuildJob(commit, branch, p){
  // build the new container and tag with git commit hash
  var build = new Job("build", "docker:dind");
  build.privileged = true;
  build.env.COMMIT = commit;
  build.env.DOCKER_USER = p.secrets.dockerUsr
  build.env.DOCKER_PASS = p.secrets.dockerPass
  build.tasks = [
    "dockerd-entrypoint.sh &", // Start the docker daemon
    "sleep 20", // Grant it enough time to be up and running
    "apk update && apk add git",
    "git clone https://github.com/gctools-outilsgc/gcconnex.git && cd /gcconnex/",
    "git config user.email 'you@example.com' && git config user.name 'Name' && git checkout master && git merge --no-edit origin/" + branch,
    "docker build -t phanoix/gcconnex:$COMMIT .",
    "docker login -u $DOCKER_USER -p $DOCKER_PASS",
    "docker push phanoix/gcconnex:$COMMIT",
    "docker logout"
  ];

  return build;
}

function createNS(e, p) {
  const prbranch = JSON.parse(e.payload).pull_request.head.ref
  const prsha = JSON.parse(e.payload).pull_request.head.sha

  var installNS = new Job("install-ns", "lachlanevenson/k8s-kubectl")
  installNS.tasks = [
    "kubectl create namespace pr-${PR_BRANCH}",
    "kubectl create namespace pr-${PR_BRANCH}-connex"
  ]
  installNS.env = {
    PR_BRANCH: prbranch
  }

  const build = createBuildJob(prsha, prbranch, p)

  // This will create the collaband connex review sites
  const installChart = new Job("install-chart", "lachlanevenson/k8s-helm")
  installChart.tasks = [
    'apk add git',
    'git clone https://github.com/gctools-outilsgc/gcconnex.git',
    'helm install test ./gcconnex/.chart/collab/ --namespace pr-${PR_BRANCH} \
    --set url="https://pr-${PR_BRANCH}.test.phanoix.com/" \
    --set image.tag="${PR_SHA}"',
    'helm install test ./gcconnex/.chart/collab/ --namespace pr-${PR_BRANCH}-connex \
    --set url="https://pr-${PR_BRANCH}-connex.test.phanoix.com/" \
    --set image.tag="${PR_SHA}" --set env.init="gcconnex"'
  ]
  installChart.env = {
    PR_BRANCH: prbranch,
    PR_SHA: prsha
  }

  installNS.run().then(
    () => installChart.run()
  )
}

function cleanupResources(e, p) {
  // delete the namespace for the PR site
  var cleanup = new Job("cleanup", "lachlanevenson/k8s-kubectl")
  cleanup.tasks = [
    "kubectl delete namespace pr-${PR_BRANCH}",
    "kubectl delete namespace pr-${PR_BRANCH}-connex"
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
  
  if (!payload.check_suite.pull_requests || payload.check_suite.pull_requests.length == 0){
    console.log("not a PR")
    return 0
  }
  console.log("updating review site for PR " + payload.check_suite.pull_requests)
  

  const prbranch = payload.check_suite.head_branch
  const prsha = payload.check_suite.head_sha
  

  // Common configuration
  const env = {
    CHECK_PAYLOAD: e.payload,
    CHECK_NAME: "Review Site",
    CHECK_TITLE: "Testing https://pr-"+prbranch+".test.phanoix.com/",
  }
  
  const build = createBuildJob(prsha, prbranch, p)

  // This will update the review site
  const installChart = new Job("install-chart", "lachlanevenson/k8s-helm")
  installChart.tasks = [
    'apk add --update coreutils git curl',
    'git clone https://github.com/gctools-outilsgc/gcconnex.git',
    'curl -LO https://storage.googleapis.com/kubernetes-release/release/v1.19.0/bin/linux/amd64/kubectl \
     && chmod +x ./kubectl && mv ./kubectl /usr/local/bin/kubectl',
    'helm upgrade test ./gcconnex/.chart/collab/ --namespace pr-${PR_BRANCH} --reuse-values \
     --set mariadb.auth.password=$(kubectl get secret --namespace pr-${PR_BRANCH} test-collab-env -o jsonpath="{.data.db-password}" | base64 --decode) \
     --set image.tag="${PR_SHA}"',
    'helm upgrade test ./gcconnex/.chart/collab/ --namespace pr-${PR_BRANCH}-connex --reuse-values \
     --set mariadb.auth.password=$(kubectl get secret --namespace pr-${PR_BRANCH}-connex test-collab-env -o jsonpath="{.data.db-password}" | base64 --decode) \
     --set image.tag="${PR_SHA}"'
  ]
  installChart.env = {
    PR_BRANCH: prbranch,
    PR_SHA: prsha
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
    build.privileged = true;
    return build.run()
  }).then(() => {
    return installChart.run()
  }).then( (result) => {
    end.env.CHECK_CONCLUSION = "success"
    end.env.CHECK_SUMMARY = "updated 'Testing https://pr-'+prbranch+'.test.phanoix.com/' and 'Testing https://pr-'+prbranch+'-connex.test.phanoix.com/'"
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
