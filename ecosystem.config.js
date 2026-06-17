module.exports = {
  apps: [{
    name: 'SGDH-FRONT',
    script: './node_modules/next/dist/bin/next',
    args: 'start -p 3094',
    cwd: 'C:\\inetpub\\wwwroot\\SGDH---FRONT',
    env: {
      NODE_ENV: 'production',
      PORT: '3094'
    }
  }]
}
