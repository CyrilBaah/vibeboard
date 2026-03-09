CLUSTER_NAME   := vibeboard
LITMUS_NS      := litmus
HELM_RELEASE   := chaos
LITMUS_PORT    := 9091
LITMUS_VALUES  := cluster/litmus-values.yaml

.PHONY: help cluster-create cluster-delete litmus-install litmus-upgrade litmus-uninstall litmus-status litmus-open litmus-port-forward cluster-status

help: 
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-24s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "  Local Litmus URL: http://localhost:$(LITMUS_PORT)"
	@echo "  Credentials:      admin / litmus"

# Create vibeboard cluster
cluster-create:
	kind create cluster --name $(CLUSTER_NAME) --config cluster/kind-cluster-config.yaml

# Delete vibeboard cluster
cluster-delete:
	kind delete cluster --name $(CLUSTER_NAME)

# Show cluster info and nodes
cluster-status: 
	kubectl cluster-info --context kind-$(CLUSTER_NAME)
	kubectl get nodes

# Install Litmus ChaosCenter via Helm (creates litmus namespace)
litmus-install: 
	helm repo add litmuschaos https://litmuschaos.github.io/litmus-helm/ 2>/dev/null || true
	helm repo update litmuschaos
	kubectl create namespace $(LITMUS_NS) --dry-run=client -o yaml | kubectl apply -f -
	helm install $(HELM_RELEASE) litmuschaos/litmus \
		--namespace=$(LITMUS_NS) \
		--values $(LITMUS_VALUES)
	@echo ""
	@echo "Litmus installed. Run 'make litmus-status' to watch pods come up."
	@echo "Once ready, run 'make litmus-port-forward' and open http://localhost:$(LITMUS_PORT)"

litmus-upgrade: ## Upgrade/re-apply Litmus Helm values
	helm upgrade $(HELM_RELEASE) litmuschaos/litmus \
		--namespace=$(LITMUS_NS) \
		--values $(LITMUS_VALUES)

litmus-uninstall: ## Uninstall Litmus (leaves namespace intact)
	helm uninstall $(HELM_RELEASE) --namespace=$(LITMUS_NS)
	kubectl delete pvc --all -n $(LITMUS_NS) --ignore-not-found

litmus-status: ## Show all Litmus pods and services
	@echo "=== Pods ==="
	kubectl get pods -n $(LITMUS_NS)
	@echo ""
	@echo "=== Services ==="
	kubectl get svc -n $(LITMUS_NS)

# Port-forward Litmus UI to localhost (blocks)
litmus-port-forward:
	@echo "Litmus ChaosCenter → http://localhost:$(LITMUS_PORT)"
	@echo "Login: admin / litmus"
	@echo "Press Ctrl-C to stop."
	kubectl port-forward -n $(LITMUS_NS) svc/chaos-litmus-frontend-service $(LITMUS_PORT):$(LITMUS_PORT)

# Open Litmus UI in browser (background port-forward)
litmus-open:
	kubectl port-forward -n $(LITMUS_NS) svc/chaos-litmus-frontend-service $(LITMUS_PORT):$(LITMUS_PORT) &
	sleep 2 && open http://localhost:$(LITMUS_PORT)


# Completely setup the cluster and Litmus ChaosCenter
up: cluster-create litmus-install 

# Completely teardown the cluster and Litmus ChaosCenter
down: litmus-uninstall cluster-delete ## Uninstall Litmus AND delete the cluster
