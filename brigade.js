const { events, Job } = require("brigadier");

events.on("push", function(e, project) {
  console.log("received push for commit " + e.commit)
  
  hello.env.CHATKEY = project.secrets.chatKey
  var hello = new Job("hello", "alpine:3.4")
  hello.tasks = [
    "echo Hello",
    "echo World",
    "curl -X POST -H 'Content-Type: application/json' --data '{\"username\":\"Brigade\",\"icon_emoji\":\":k8s:\",\"text\":\"Testing 123\",\"attachments\":[{\"title\":\"Hello World from brigade!\",\"image_url\":\"https://brigade.sh/assets/images/brigade.png\",\"color\":\"#764FA5\"}]}' https://message.gccollab.ca/hooks/$CHATKEY"   //test rocket chat notification   //test rocket chat notification
  ]
  
  hello.run()
})
