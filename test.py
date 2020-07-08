import json
import requests

from kubernetes import client, config

def get_latest_sha(repo):
    latest = requests.get("https://hub.docker.com/v2/repositories/" + repo + "/tags/latest")
    test = json.loads(latest.text)
    print(test["images"][0]["digest"])


if __name__ == "__main__":
    repo = "digitalcollab/profile-apollo"
    get_latest_sha(repo)

    config.load_kube_config()

