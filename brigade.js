const { events, Job } = require("brigadier");

events.on("push", function(e, project) {
  console.log("received push for commit " + e.revision.commit)
  
  var build = new Job("build", "docker:dind")
  build.privileged = true;
  build.env.COMMIT = e.revision.commit
  build.tasks = [
    "dockerd-entrypoint.sh &", // Start the docker daemon
    "sleep 20", // Grant it enough time to be up and running
    "apk update",
    "apk add git",
    "git checkout https://github.com/gctools-outilsgc/gcconnex.git",
    "cd gcconnex/",
    "Docker build -t gcconnex:$COMMIT ."
  ]
  
  var hello = new Job("hello", "alpine:3.4")
  hello.env.CHATKEY = project.secrets.chatKey
  hello.tasks = [
    "echo Hello",
    "echo World",
    "apk update",
    "apk add curl",
    "curl -X POST -H 'Content-Type: application/json' --data '{\"username\":\"Brigade\",\"icon_emoji\":\":k8s:\",\"text\":\"Testing Brigade\",\"attachments\":[{\"title\":\"Brigade build finished!\",\"image_url\":\"https://brigade.sh/assets/images/brigade.png\",\"color\":\"#764FA5\"}]}' https://message.gccollab.ca/hooks/$CHATKEY"      //test rocket chat notification
  ]
  
  build.run().then(() => { hello.run() })
})
