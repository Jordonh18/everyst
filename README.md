# Everyst - Server Monitoring & Security Platform

![Everyst Logo](public/Logo-white-no-text.svg)

## Overview

Everyst is a comprehensive server monitoring and security management platform designed for modern infrastructure needs. Built with React, TypeScript, and Django, it provides a clean, responsive interface for real-time system monitoring, security analysis, and network management.

** Development Status:** Everyst is currently in **Alpha** development. While functional, it is not recommended for production environments. Use at your own discretion.

## Features

### Real-time Monitoring

- Live server performance metrics
- Resource utilization tracking
- System uptime monitoring
- Interactive dashboards with real-time updates

### Security Management

- Advanced threat detection
- Security event analysis
- Automated security alerts
- Vulnerability assessment tools

### Network Diagnostics

- Network performance analysis
- Connectivity testing tools
- Traffic monitoring
- Infrastructure mapping

### User Management

- Role-based access control
- Multi-user support
- Secure authentication
- Activity logging

## Architecture

Everyst follows a modern full-stack architecture designed for scalability and maintainability:

### Frontend Stack

- **React 18** with TypeScript for type-safe development
- **Vite** for fast build tooling and development server
- **Tailwind CSS** for responsive, utility-first styling
- **Framer Motion** for smooth animations and transitions
- **Real-time WebSocket** integration for live updates

### Backend Stack

- **Django** REST framework for robust API development
- **WebSocket support** for real-time communication
- **SQLite** database (development) with PostgreSQL support
- **Secure authentication** with JWT tokens
- **RESTful API** design with comprehensive documentation

### Security Features

- HTTPS-only communication with TLS 1.3
- Secure WebSocket connections (WSS)
- CSRF protection and security headers
- Input validation and sanitization
- Rate limiting and DDoS protection

## Project Goals

Everyst aims to address the limitations of existing server management solutions by providing:

1. **Modern Interface**: Clean, intuitive UI that works seamlessly across devices
2. **Performance**: Fast, responsive experience with real-time updates
3. **Security-First**: Built with security best practices from the ground up
4. **Extensibility**: Modular architecture for easy feature additions
5. **Reliability**: Robust error handling and graceful degradation

## Installation & Setup

### Prerequisites

Before installing Everyst, ensure your system meets the following requirements:

- **Node.js** 18+ with npm
- **Python** 3.10+
- **Virtual environment** support (venv recommended)
- **curl** for dependency management
- **sudo** privileges for system configuration

### Quick Start

Everyst provides automated installation scripts for both development and production-like environments.

#### Development Setup (Recommended)

For development, testing, or local deployment:

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Jordonh18/Everyst.git
   cd Everyst
   ```

2. **Configure environment variables:**

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file to customize settings. See the [Environment Variables Guide](docs/getting-started/environment-variables.md) for detailed configuration options.

3. **Run the development setup:**

   ```bash
   sudo ./setup-dev.sh
   ```

   This script will:
   - Verify and install prerequisites
   - Create a Python virtual environment
   - Install backend dependencies
   - Run database migrations
   - Install frontend dependencies
   - Configure development permissions

4. **Activate the virtual environment:**

   ```bash
   source venv/bin/activate
   ```

5. **Start the development server:**

   ```bash
   sudo npm run dev
   ```

6. **Access the application:**

   Navigate to `https://localhost:5173` in your browser. The application uses HTTPS with self-signed certificates for development, so you may need to accept security warnings.

#### Production Installation

**⚠️ Warning:** Production deployment is not recommended at this time. Everyst is in alpha development and lacks production-ready security hardening and stability features.

If you still wish to proceed with a production-like setup:

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Jordonh18/Everyst.git
   cd Everyst
   ```

2. **Run the production installer:**

   ```bash
   sudo ./install.sh
   ```

   This script will:
   - Create a dedicated system user (`Everyst`)
   - Build the frontend for production
   - Configure production file permissions
   - Optionally create systemd service files

### Post-Installation

After successful installation:

1. **First Run:** Follow the on-screen setup wizard to create your admin account
2. **Security:** Review the [Security Hardening Guide](docs/security-hardening-guide.md)
3. **Configuration:** Consult the [Configuration Documentation](docs/getting-started/configuration.md)
4. **Troubleshooting:** See [Troubleshooting Guide](docs/troubleshooting.md) for common issues

## Contributing

Everyst is an open-source project that welcomes contributions from the community. Whether you're a developer, designer, or user, there are many ways to get involved:

### How to Contribute

- **Report Issues:** Found a bug? [Submit an issue](https://github.com/Jordonh18/Everyst/issues) with detailed reproduction steps
- **Feature Requests:** Have an idea? Share it through our issue tracker
- **Code Contributions:** Fork the repository and submit pull requests
- **Documentation:** Help improve our guides and documentation
- **Testing:** Test new features and provide feedback

### Development Guidelines

- Follow existing code style and conventions
- Write clear, comprehensive comments
- Include tests for new functionality
- Update documentation for new features
- Ensure all CI checks pass before submitting PRs

### Community Standards

We are committed to providing a welcoming and inclusive environment for all contributors.

## Support & Community

### Getting Help

- **Documentation:** Check our comprehensive guides first
- **Issues:** Search existing issues or create a new one
- **Discussions:** Join community discussions on GitHub

## Acknowledgments

### Logo Design

The Everyst logo was designed by Katie McKinlay. Their creative contribution has been essential to establishing the visual identity of this project.

### Contributors

Thanks to all who have contributed to making Everyst better! See [CONTRIBUTORS.md](CONTRIBUTORS.md) for a complete list.

## Support Development

If you find Everyst useful, consider supporting continued development:

[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/jordonh)

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

---

**Everyst** - Modern server monitoring and security management  
Built with ❤️ for the open-source community
