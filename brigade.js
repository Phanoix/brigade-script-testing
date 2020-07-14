const { events, Job } = require("brigadier");

events.on("image_push", function(e, project) {
  var docker = JSON.parse(e.payload)

  if (docker.tag != "latest") {
    console.log(`ignoring non-master build for branch ${docker.tag}`)
    return
  }
  
  var update = new Job("update", "python:3")
  update.env.TIMESTAMP = 0
  update.tasks = [
    "pip install kubernetes",
    "python test.py"
  ]
  
  var notify = new Job("notify", "alpine:3.4")
  notify.env.CHATKEY = project.secrets.chatKey
  notify.tasks = [
    "apk update && apk add curl",
    "curl -X POST -H 'Content-Type: application/json' --data '{\"username\":\"Brigade\",\"icon_emoji\":\":k8s:\",\"text\":\"Brigade test update finished.\",\"attachments\":[{\"title\":\"Brigade update finished!\",\"title_link\": \"https://hub.docker.com/r/phanoix/gcconnex/tags/\",\"text\": \"New image available at Docker hub.\",\"color\":\"#764FA5\"}]}' https://message.gccollab.ca/hooks/$CHATKEY"      //test rocket chat notification
  ]
  
  update.run().then(() => { notify.run() })
})
