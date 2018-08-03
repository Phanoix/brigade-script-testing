const { events, Job } = require("brigadier");

events.on("pull_request", function(e, project) {
  var kube = new Job("kube", "lachlanevenson/k8s-kubectl")
  kube.tasks = [
    "kubectl get pods -o wide",
  ]
  
  var hello = new Job("hello", "alpine:3.4")
  hello.env.CHATKEY = project.secrets.chatKey
  hello.tasks = [
    "apk update",
    "apk add curl",
    "curl -X POST -H 'Content-Type: application/json' --data '{\"username\":\"Brigade\",\"icon_emoji\":\":k8s:\",\"text\":\"Brigade build finished.\",\"attachments\":[{\"title\":\"A wild pull request has appeared!\",\"title_link\": \"https://github.com/Phanoix/brigade-script-testing/pulls\",\"text\": \"New PR created.\",\"color\":\"#764FA5\"}]}' https://message.gccollab.ca/hooks/$CHATKEY"      //test rocket chat notification
  ]
  
  kube.run().then(() => { hello.run() })
})

events.on("push", function(e, project) {
  console.log("received push for commit " + e.revision.commit)
  
  var build = new Job("build", "docker:dind")
  build.privileged = true;
  build.env.COMMIT = e.revision.commit
  build.env.DOCKER_USER = project.secrets.dockerUsr
  build.env.DOCKER_PASS = project.secrets.dockerPass
  build.tasks = [
    "dockerd-entrypoint.sh &", // Start the docker daemon
    "sleep 20", // Grant it enough time to be up and running
    "apk update",
    "apk add git",
    "git clone https://github.com/gctools-outilsgc/gcconnex.git",
    "cd gcconnex/",
    "docker build -t phanoix/gcconnex:test-$COMMIT .",
    "docker login -u $DOCKER_USER -p $DOCKER_PASS",
    "docker push phanoix/gcconnex:test-$COMMIT"
  ]
  
  var hello = new Job("hello", "alpine:3.4")
  hello.env.CHATKEY = project.secrets.chatKey
  hello.tasks = [
    "echo Hello",
    "echo World",
    "apk update",
    "apk add curl",
    "curl -X POST -H 'Content-Type: application/json' --data '{\"username\":\"Brigade\",\"icon_emoji\":\":k8s:\",\"text\":\"Brigade build finished.\",\"attachments\":[{\"title\":\"Brigade build finished!\",\"title_link\": \"https://hub.docker.com/r/phanoix/gcconnex/tags/\",\"text\": \"New image available at Docker hub.\",\"color\":\"#764FA5\"}]}' https://message.gccollab.ca/hooks/$CHATKEY"      //test rocket chat notification
  ]
  
  build.run().then(() => { hello.run() })
})
