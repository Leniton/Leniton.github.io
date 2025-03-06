module.exports = {
    basePath: '/build',
    distDir: 'build/_next',
    async redirects() {
      return [
        {
          source: '/index.html',
          destination: '/_next/server/app/index.html',
          permanent: true,
        },
      ]
    },
  }