# vibeboard


## Prerequisites

[kind](https://kind.sigs.k8s.io/)
[kubectl](https://kubernetes.io/docs/tasks/tools/)
[Helm](https://helm.sh/)

## Quick start

```bash
# 1. Create the kind cluster + install Litmus in one shot
make up

# 2. Once all pods are Running, forward the UI to localhost
make litmus-port-forward
```
Then open **http://localhost:9091** in your browser.

Default credentials: `admin` / `litmus`
