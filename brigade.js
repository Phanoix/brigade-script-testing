const { events, Job } = require("brigadier");
const kubernetes = require("@kubernetes/client-node");
const yaml = require("js-yaml");

const checkRunImage = "brigadecore/brigade-github-check-run:latest"

const kubeConfig = new kubernetes.KubeConfig();
kubeConfig.loadFromDefault();

const k8sCoreClient = kubeConfig.makeApiClient(kubernetes.Core_v1Api);

events.on("check_suite:requested", checkRequested)
events.on("check_suite:rerequested", checkRequested)
events.on("check_run:rerequested", checkRequested)


const protectedEnvironment = namespaceName => {
  const protectedNamespaces = ["default", "kube-public", "kube-system", "brigade"];

  if (protectedNamespaces.includes(namespaceName)) {
    return true;
  }
  return false;
};

const createNamespace = async namespaceName => {
  const existingNamespace = await k8sCoreClient.listNamespace(
    true,
    "",
    `metadata.name=${namespaceName}`,
  );

  if (existingNamespace.body.items.length) {
    console.log(`Namespace "${namespaceName}" already exists`);
    return;
  }

  const namespace = new kubernetes.V1Namespace();
  namespace.metadata = new kubernetes.V1ObjectMeta();
  namespace.metadata.name = namespaceName;

  await k8sCoreClient.createNamespace(namespace);
};

const provisionEnvironment = async (environmentName, projects) => {
  await createNamespace(environmentName);
};

function checkRequested(e, p) {
  console.log("check requested")
  // Common configuration
  const env = {
    CHECK_PAYLOAD: e.payload,
    CHECK_NAME: "MyService",
    CHECK_TITLE: "Echo Test 12345",
  }

  // This will represent our build job. For us, it's just an empty thinger.
  const build = new Job("build", "alpine:3.7", ["sleep 60", "echo hello"])

  // For convenience, we'll create three jobs: one for each GitHub Check
  // stage.
  const start = new Job("start-run", checkRunImage)
  start.imageForcePull = true
  start.env = env
  start.env.CHECK_SUMMARY = "Beginning test run, see https://dev.phanoix.com"
  start.env.CHECK_DETAILS_URL = "https://dev.phanoix.com"

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
    end.env.CHECK_DETAILS_URL = "https://dev.phanoix.com/foobar"
    return end.run()
  }).catch( (err) => {
    // In this case, we mark the ending failed.
    end.env.CHECK_CONCLUSION = "failure"
    end.env.CHECK_SUMMARY = "Build failed"
    end.env.CHECK_TEXT = `Error: ${ err }`
    return end.run()
  })
}

events.on("image_push", function(e, project) {
  var docker = JSON.parse(e.payload)

  if (docker.push_data.tag != "latest") {
    console.log(`ignoring non-master build for branch ${docker.push_data.tag}`)
    return
  }
  
  var update = new Job("update", "python:3")
  update.tasks = [
    "pip install kubernetes",
    "python /src/test.py"
  ]
  
  var notify = new Job("notify", "alpine:3.4")
  notify.env.CHATKEY = project.secrets.chatKey
  notify.tasks = [
    "apk update && apk add curl",
    "curl -X POST -H 'Content-Type: application/json' --data '{\"username\":\"Brigade\",\"icon_emoji\":\":k8s:\",\"text\":\"Brigade test update finished.\",\"attachments\":[{\"title\":\"Brigade update finished!\",\"title_link\": \"https://hub.docker.com/r/phanoix/gcconnex/tags/\",\"text\": \"New image available at Docker hub.\",\"color\":\"#764FA5\"}]}' https://message.gccollab.ca/hooks/$CHATKEY"      //test rocket chat notification
  ]
  
  update.run().then(() => { notify.run() })
})
