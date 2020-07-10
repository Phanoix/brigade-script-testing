import json
import requests

from kubernetes import client, config

def get_latest_sha(repo):
    latest = requests.get("https://hub.docker.com/v2/repositories/" + repo + "/tags/latest")
    data = json.loads(latest.text)
    sha = data["images"][0]["digest"]
    return sha[7:]

def k8s_get_deploy():
    config.load_incluster_config()

    v1 = client.AppsV1Api()
    print("Listing pods with their IPs:")
    ret = v1.list_namespaced_deployment(watch=False, namespace="directory")
    for i in ret.items:
        print("=== %s\t%s\t%s\t%s" %
            (i.spec.replicas, i.metadata.namespace, i.metadata.name, i.spec.template.spec.containers[0].image))

    return ret.items[0]

def patch_deploy():
    v1 = client.AppsV1Api()

if __name__ == "__main__":
    repo = "digitalcollab/directory"
    print(get_latest_sha(repo))

    config.load_incluster_config()
    deploy = k8s_get_deploy()

    print("\n")
    print("%s\t%s\t%s\t%s" %
        (deploy.spec.replicas, deploy.metadata.namespace, deploy.metadata.name, deploy.spec.template.spec.containers[0].image))