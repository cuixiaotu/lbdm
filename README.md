# lbdm

An Electron application with Vue and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

## Project Setup

### Install

```bash
$ pnpm install
```

### Configuration

**Development Environment**:

1. Copy the example configuration:

   ```bash
   cp config.dev.example.json config.dev.json
   ```

2. Edit `config.dev.json` with your settings:
   ```json
   {
     "api": {
       "apiUrl": "https://your-api.example.com",
       "testApi": "https://test-api.example.com"
     },
     "ssh": {
       "server": "192.168.1.100",
       "port": 22,
       "user": "admin",
       "password": "your-password",
       "useSshKey": false,
       "privateKey": ""
     }
   }
   ```

**Note**: `config.dev.json` is git-ignored and will be used in development mode.

For more details, see [Development Configuration Guide](docs/DEV_CONFIG.md).

### Development

```bash
$ pnpm dev
```

The application will use `config.dev.json` from the project root directory.

### Build

```bash
# For windows
$ pnpm run build:win

# For macOS
$ pnpm run build:mac

# For Linux
$ pnpm run build:linux
```

**Note**: Production builds will use the system's user data directory for configuration.

## Documentation

- [Development Configuration](docs/DEV_CONFIG.md) - Development environment configuration guide
- [Form Validation](docs/FORM_VALIDATION.md) - Form validation rules
- [Message Box Feature](docs/FEATURE_MESSAGE_BOX.md) - Native message box usage
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions
