const { events, Job } = require("brigadier");
const checkRunImage = "brigadecore/brigade-github-check-run:latest"

events.on("check_suite:requested", updateSite)
events.on("pull_request:opened", installSite)
events.on("pull_request:reopened", installSite)
events.on("pull_request:closed", cleanupResources)


function installSite(e, p) {
  // will use helm to install
  var install = new Job("install", "lachlanevenson/k8s-kubectl")
  install.tasks = [
    "kubectl create namespace pr-${PR_NUMBER}"
  ]
  install.env = {
    PR_NUMBER: "0"
  }

  console.log(e.payload)
  
  console.log(e.payload.number)

  install.run()
}

function cleanupResources(e, p) {
  // delete the namespace for the PR site
  var cleanup = new Job("cleanup", "lachlanevenson/k8s-kubectl")
  cleanup.tasks = [
    "kubectl delete namespace pr-${PR_NUMBER}"
  ]
  cleanup.env = {
    PR_NUMBER: "0"
  }

  console.log(e.payload)
  
  console.log(e.payload.number)

  cleanup.run()
}

function updateSite(e, p) {
  console.log("update requested")
  // Common configuration
  const env = {
    CHECK_PAYLOAD: e.payload,
    CHECK_NAME: "Review Site",
    CHECK_TITLE: "Testing 123",
  }

  // This will represent our build job. For us, it's just an empty thinger.
  const build = new Job("build", "alpine:3.7", ["sleep 60", "echo hello"])

  // For convenience, we'll create three jobs: one for each GitHub Check
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
    return build.run()
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

