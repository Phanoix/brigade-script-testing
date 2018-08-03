const { events, Job } = require("brigadier");

events.on("push", function(e, project) {
  console.log("received push for commit " + e.revision.commit)
  
  var hello = new Job("hello", "alpine:3.4")
  hello.env.CHATKEY = project.secrets.chatKey
  hello.tasks = [
    "echo Hello",
    "echo World",
    "apk update",
    "apk add curl",
    "curl -X POST -H 'Content-Type: application/json' --data '{\"username\":\"Brigade\",\"icon_emoji\":\":k8s:\",\"text\":\"Testing 123\",\"attachments\":[{\"title\":\"Hello World from brigade!\",\"image_url\":\"https://brigade.sh/assets/images/brigade.png\",\"color\":\"#764FA5\"}]}' https://message.gccollab.ca/hooks/$CHATKEY"   //test rocket chat notification   //test rocket chat notification
  ]
  
  hello.run()
})
