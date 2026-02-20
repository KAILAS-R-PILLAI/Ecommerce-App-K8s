# E-Commerce MERN Stack on Kubernetes with Monitoring (EKS + Prometheus + Grafana)

## Project Overview

This project deploys a MERN (MongoDB, Express, React, Node.js) stack e-commerce application on an **EKS cluster** using Kubernetes manifests. It also integrates **Prometheus & Grafana** to monitor the metrices.

Key Features:  
- Dockerized **frontend** and **backend** applications.  
- MongoDB deployment.  
- Kubernetes **Deployments, Services, Secrets**.  
- Monitoring with **Prometheus & Grafana**, including **ServiceMonitors** for custom metrics.  
- Alerts and dashboards for metrics.  

---

## Prerequisites

- AWS CLI configured with access to your account.  
- `kubectl` installed and configured for EKS.  
- Docker installed locally.  
- Helm installed for Prometheus/Grafana deployment.  

---

## EKS Setup
### Step 1: Create EKS Cluster 

```bash
# Create EKS cluster using AWS CLI
aws eks create-cluster \
  --name ecommerce-cluster \
  --region ap-south-1 \
  --nodegroup-name ecommerce-nodes \
  --node-type t3.medium
  --nodes 2 
```
![alt text](<Screenshot 2026-02-18 212522.png>)
![alt text](<Screenshot 2026-02-18 212535.png>)
### Step 2: Update Kubeconfig to Connect to the Cluster

```bash
aws eks update-kubeconfig --name ecommerce-cluster --region ap-south-1
kubectl get nodes

```

### Step 3: Create Namespace

```bash
kubectl create namespace ecommerce          # for Frontend, Backend and Database Pods
kubectl create namespace monitoring         # for Prometheus and Grafana Pods

```
---

## Build and Push Docker Images to ECR

### Step 1: Login to ECR

```bash
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com

```

### Step 2: Create ECR Repositories

```bash
aws ecr create-repository --repository-name ecommerce-backend --region ap-south-1
aws ecr create-repository --repository-name ecommerce-frontend --region ap-south-1

```

### Step 3: Build, Tag, and Push Images

```bash
# Build Backend Docker image
docker build -t ecommerce-backend ./backend

# Tag for ECR
docker tag ecommerce-backend:latest <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/ecommerce-backend:latest

# Push to ECR
docker push <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/ecommerce-backend:latest

# Build Frontend Docker image
docker build -t ecommerce-frontend ./frontend

# Tag for ECR
docker tag ecommerce-frontend:latest <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/ecommerce-frontend:latest

# Push to ECR
docker push <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/ecommerce-frontend:latest

```
![alt text](<Screenshot 2026-02-20 004347.png>)
---

## K8s Deployment

### Step 1: Creating Manifest Files

**Manifest Files** in Kubernetes are basically blueprints that tell the cluster what to create, how to configure it, and how it should behave.

For **mongo**:
- mongo-secret.yml (Securely store credentials)
- mongo-deployment.yml (Tell Kubernetes how to run MongoDB pods)
- mongo-service.yml (Give backend a stable internal endpoint to reach MongoDB)

For **Backend**:
- backend-secret.yml
- backend-deployment.yml
- backend-service.yml
- backend-servicemonitor.yml (Add Backend Service to Prometheus)

For **Frontend**:
- frontend-deployment.yml
- frontend-service.yml

### Step 2 : Deployed each Services Using Manifest Files

```bash
# mongo
kubectl apply -f mongo/mongo-secret.yaml -n ecommerce
kubectl apply -f mongo/mongo-deployment.yaml -n ecommerce
kubectl apply -f mongo/mongo-service.yaml -n ecommerce

# backend
kubectl apply -f backend/backend-secret.yaml -n ecommerce
kubectl apply -f backend/backend-deployment.yaml -n ecommerce
kubectl apply -f backend/backend-service.yaml -n ecommerce
kubectl apply -f backend/backend-servicemonitor.yaml -n ecommerce

# frontend
kubectl apply -f frontend/frontend-deployment.yaml -n ecommerce
kubectl apply -f frontend/frontend-service.yaml -n ecommerce

```

### Step 3: Verify Pods, Services & Metrics

```bash
# List pods in ecommerce namespace
kubectl get pods -n ecommerce

# List services in ecommerce namespace
kubectl get svc -n ecommerce

# Check ServiceMonitor
kubectl get servicemonitor -n ecommerce

# Verify backend metrics endpoint
kubectl port-forward -n ecommerce svc/backend 5000:5000     #Backend exposes metrics via prom-client added in the server.js backend code
curl http://localhost:5000/metrics

```
Access the application via the **Load Balancer DNS Name** from frontend service endpoint

![Admin Dashboard](<Screenshot 2026-02-18 231232.png>)
![User Dashboard](<Screenshot 2026-02-19 223828.png>)

---

## Setup Prometheus and Grafana

### Step 1: Add Helm repo

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

```
![alt text](<Screenshot 2026-02-19 231536.png>)

### Step 2: Install kube-prometheus-stack

```bash
helm install monitoring prometheus-community/kube-prometheus-stack -n monitoring

```

### Step 3: Check that Prometheus pods are running

```bash
kubectl get pods -n monitoring

```
![alt text](<Screenshot 2026-02-19 231551.png>)

### Step 4: Port-forward Prometheus and Grafana

```bash
kubectl port-forward -n monitoring svc/monitoring-kube-prometheus-prometheus 9090:9090
kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80

```

### Steps 5: Access Grafana and Prometheus

http://localhost:9090
http://localhost:3000

### Step 6: Get Default Grafana credentials stored in secret

```bash
kubectl get secret monitoring-grafana -n monitoring -o jsonpath="{.data.admin-password}" | base64 --decode

```

### Step 7: Edit Prometheus to Include ServiceMonitor

```bash
kubectl edit prometheus monitoring-kube-prometheus-prometheus -n monitoring

```
- Ensure the following snippet exists under **spec**:
```YAML
# serviceMonitorNamespaceSelector restricted to the ecommerce namespace.
serviceMonitorSelector:
  matchLabels:
    release: monitoring
serviceMonitorNamespaceSelector:
  matchNames:
    - ecommerce
```
- This ensures Prometheus discovers the backend-monitor ServiceMonitor and scrapes backend metrics automatically.

### Step 8: Verify Backend Metrics in Prometheus

After deploying Prometheus and the `ServiceMonitor` for the backend, open Prometheus (via port-forward or service URL):

```bash
kubectl port-forward -n monitoring svc/monitoring-kube-prometheus-prometheus 9090:9090

```
**State: UP** indicates Prometheus is successfully scraping metrics from the backend.

---

## Using Custom Dashboards

- Select data source and import.

- Choose the Prometheus data source.

- Go to + → Create → Dashboard → Add a new panel.

- Choose your Prometheus data source.

- Use queries for backend metrics.

- Configure visualization type (Graph, Gauge, Table, etc.) and save the panel.

  - Add multiple panels to track:

    - Heap memory usage

    - Garbage collection

    - HTTP request counters

    - Custom application metrics

- Adjust variables for namespace ecommerce if needed.

![Custom Dashboard Created Using Grafana](<Screenshot 2026-02-20 002323.png>)

---

## Pre-Built Dashboards

When you install the `kube-prometheus-stack` using Helm, Grafana comes with **pre-configured dashboards** that allow you to monitor your Kubernetes cluster and workloads without any extra setup.

1. **Kubernetes / Cluster Overview**
   - Go to **Dashboards → Browse → Kubernetes / Cluster**.
   - Provides an overview of:
     - Nodes: CPU, memory, and filesystem usage
     - Pods: Running, pending, failed, or succeeded
     - Cluster-wide metrics such as network I/O and storage usage

2. **Kubernetes / Nodes**
   - Shows metrics per node:
     - CPU utilization, memory consumption
     - Disk I/O
     - Network traffic per node
   - Helps track the health of each EKS node.

3. **Kubernetes / Pods**
   - Displays metrics for all pods in the cluster:
     - CPU and memory usage per pod
     - Pod restarts and status
     - Network usage per pod
   - You can filter by **namespace**, e.g., `ecommerce`, to see metrics for your backend, frontend, and MongoDB pods.

4. **Kubernetes / Workloads**
   - Visualizes deployments, daemonsets, and statefulsets:
     - Number of replicas running vs. desired
     - Resource consumption per deployment
     - Useful for quickly identifying failing pods or scaling issues

5. **Node Exporter / Host Metrics**
   - Collects node-level metrics such as:
     - CPU load averages
     - Disk usage and inode consumption
     - Memory and swap usage
   - Works automatically for all nodes without additional configuration.

![Pre-Built Dashboard](<Screenshot 2026-02-19 225138.png>)