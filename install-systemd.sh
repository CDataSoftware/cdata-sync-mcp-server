#!/bin/bash
# Installation script for CData Sync MCP Server as systemd service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="cdata-sync-mcp"
SERVICE_USER="cdata-mcp"
SERVICE_GROUP="cdata-mcp"
INSTALL_DIR="/opt/cdata-sync-mcp-server"
CONFIG_DIR="/etc/cdata-sync-mcp"
LOG_DIR="/var/log/cdata-sync-mcp"

echo -e "${GREEN}Installing CData Sync MCP Server as systemd service...${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}" 
   exit 1
fi

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js version 18+ is required. Current version: $(node -v)${NC}"
    exit 1
fi

# Create service user
echo -e "${YELLOW}Creating service user...${NC}"
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd --system --shell /bin/false --home-dir /nonexistent --comment "CData Sync MCP Server" "$SERVICE_USER"
    echo -e "${GREEN}Created user: $SERVICE_USER${NC}"
else
    echo -e "${YELLOW}User $SERVICE_USER already exists${NC}"
fi

# Create directories
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p "$INSTALL_DIR"
mkdir -p "$CONFIG_DIR"
mkdir -p "$LOG_DIR"

# Build the project
echo -e "${YELLOW}Building project...${NC}"
npm install --production=false
npm run build

# Copy files
echo -e "${YELLOW}Installing files...${NC}"
cp -r dist "$INSTALL_DIR/"
cp -r node_modules "$INSTALL_DIR/"
cp package*.json "$INSTALL_DIR/"

# Create environment file
echo -e "${YELLOW}Creating environment configuration...${NC}"
cat > "$CONFIG_DIR/environment" << EOF
# CData Sync MCP Server Configuration
# Edit this file to configure your CData Sync connection

# CData Sync API endpoint
CDATA_BASE_URL=http://localhost:8181/api.rsc

# Authentication (choose one method)
# Option 1: API Token (recommended)
#CDATA_AUTH_TOKEN=your-api-token-here

# Option 2: Basic Auth
#CDATA_USERNAME=your-username
#CDATA_PASSWORD=your-password

# Transport configuration
MCP_TRANSPORT_MODE=http
MCP_HTTP_PORT=3000
SSE_PORT=3001
DISABLE_SSE=false

# Logging
LOG_LEVEL=info
DEBUG_HTTP=false
EOF

# Set permissions
echo -e "${YELLOW}Setting permissions...${NC}"
chown -R "$SERVICE_USER:$SERVICE_GROUP" "$INSTALL_DIR"
chown -R "$SERVICE_USER:$SERVICE_GROUP" "$CONFIG_DIR"
chown -R "$SERVICE_USER:$SERVICE_GROUP" "$LOG_DIR"
chmod 600 "$CONFIG_DIR/environment"
chmod 755 "$INSTALL_DIR"

# Install systemd service
echo -e "${YELLOW}Installing systemd service...${NC}"
cp cdata-sync-mcp.service /etc/systemd/system/
systemctl daemon-reload

# Create uninstall script
echo -e "${YELLOW}Creating uninstall script...${NC}"
cat > "$INSTALL_DIR/uninstall.sh" << 'EOF'
#!/bin/bash
# Uninstall CData Sync MCP Server

echo "Stopping and disabling service..."
systemctl stop cdata-sync-mcp
systemctl disable cdata-sync-mcp

echo "Removing files..."
rm -f /etc/systemd/system/cdata-sync-mcp.service
rm -rf /opt/cdata-sync-mcp-server
rm -rf /etc/cdata-sync-mcp
rm -rf /var/log/cdata-sync-mcp

echo "Removing user..."
userdel cdata-mcp 2>/dev/null || true

systemctl daemon-reload
echo "Uninstall complete!"
EOF

chmod +x "$INSTALL_DIR/uninstall.sh"

echo -e "${GREEN}Installation complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Edit the configuration file: ${CONFIG_DIR}/environment"
echo "2. Start the service: systemctl start ${SERVICE_NAME}"
echo "3. Enable auto-start: systemctl enable ${SERVICE_NAME}"
echo "4. View logs: journalctl -u ${SERVICE_NAME} -f"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  systemctl status ${SERVICE_NAME}    # Check service status"
echo "  systemctl restart ${SERVICE_NAME}   # Restart service"
echo "  systemctl stop ${SERVICE_NAME}      # Stop service"
echo "  ${INSTALL_DIR}/uninstall.sh         # Uninstall service"