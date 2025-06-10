# Kubernetes Deployment for CData Sync MCP Server

This directory contains Kubernetes manifests for deploying the CData Sync MCP Server in HTTP transport mode.

## Prerequisites

- Kubernetes cluster (1.19+)
- kubectl configured
- Docker registry for storing images
- CData Sync instance accessible from the cluster

## Quick Deploy

1. **Update Configuration**
   ```bash
   # Edit the ConfigMap with your CData Sync URL
   vi configmap.yaml
   
   # Edit the Secret with your authentication credentials
   vi secret.yaml
   
   # Update the Ingress with your domain
   vi ingress.yaml
   ```

2. **Build and Push Docker Image**
   ```bash
   # Build the image
   docker build -t your-registry.com/cdata-sync-mcp-server:latest ..
   
   # Push to registry
   docker push your-registry.com/cdata-sync-mcp-server:latest
   ```

3. **Deploy with kubectl**
   ```bash
   # Create all resources
   kubectl apply -f .
   
   # Or use kustomize
   kubectl apply -k .
   ```

4. **Verify Deployment**
   ```bash
   # Check pods
   kubectl get pods -n cdata-sync
   
   # Check services
   kubectl get svc -n cdata-sync
   
   # Check ingress
   kubectl get ingress -n cdata-sync
   
   # View logs
   kubectl logs -n cdata-sync -l app=cdata-sync-mcp-server
   ```

## Configuration

### Environment Variables

Configure through `configmap.yaml` and `secret.yaml`:
- `CDATA_BASE_URL` - CData Sync API endpoint
- `CDATA_AUTH_TOKEN` - API authentication token (recommended)
- `CDATA_USERNAME/PASSWORD` - Basic auth credentials (alternative)

### Scaling

The deployment includes:
- **HorizontalPodAutoscaler** - Auto-scales pods based on CPU/memory usage
- **Default Replicas** - 2 pods for high availability
- **Resource Limits** - Configured for efficient resource usage

### Ingress

Configure your domain in `ingress.yaml`. The server exposes:
- `/mcp/v1/*` - MCP API endpoints
- `/sse/*` - Server-Sent Events for real-time updates

### Security

- Runs as non-root user (UID 1001)
- Read-only root filesystem
- No privilege escalation
- Minimal capabilities

## Monitoring

### Health Checks

The deployment includes:
- **Liveness Probe** - `/mcp/v1/health` endpoint
- **Readiness Probe** - Ensures server is ready for traffic

### Logs

View logs with:
```bash
kubectl logs -n cdata-sync -l app=cdata-sync-mcp-server -f
```

## Troubleshooting

1. **Pods not starting**
   ```bash
   kubectl describe pod -n cdata-sync <pod-name>
   ```

2. **Connection issues**
   - Verify CData Sync URL is accessible from pods
   - Check network policies
   - Verify credentials in secrets

3. **Performance issues**
   - Check HPA status: `kubectl get hpa -n cdata-sync`
   - Increase resource limits if needed
   - Monitor with: `kubectl top pods -n cdata-sync`