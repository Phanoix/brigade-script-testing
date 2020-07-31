const { events, Job } = require("brigadier");

events.on("image_push", function(e, project) {
  var docker = JSON.parse(e.payload)

  if (docker.push_data.tag != "latest") {
    console.log(`ignoring non-master build for branch ${docker.push_data.tag}`)
    return
  }
  
  var update = new Job("update", "python:3")
  update.env.TIMESTAMP = 0
  update.tasks = [
    "pip install kubernetes",
    "python test.py"
  ]
  update.run()
})
