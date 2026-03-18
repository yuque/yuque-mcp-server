# Security Policy

## Reporting a Vulnerability

Please open a [security advisory](https://github.com/yuque/yuque-mcp-server/security/advisories/new) on GitHub. Do not open public issues for security vulnerabilities.

## Security Best Practices

1. **Protect Your API Token** — Never commit `YUQUE_PERSONAL_TOKEN` to version control. Use environment variables or a secrets manager.
2. **Use Read-Only Tokens** — If you only need to read data, generate a read-only token from [Yuque Settings](https://www.yuque.com/settings/tokens).
3. **Keep Dependencies Updated** — Regularly run `npm audit` and update dependencies.
4. **Review Tool Permissions** — This server can create, update, and delete content in your Yuque workspace. Understand the scope before granting access.
