/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: 'loose',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gateway.0g.ai',
        port: '',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        port: '',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'dweb.link',
        port: '',
        pathname: '/ipfs/**',
      },
    ],
    unoptimized: true, 
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Handle Node.js modules for client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        buffer: false,
        process: false,
        util: false,
        events: false,
        querystring: false,
        punycode: false,
        domain: false,
        constants: false,
        vm: false,
        child_process: false,
        worker_threads: false,
        inspector: false,
        perf_hooks: false,
        async_hooks: false,
        cluster: false,
        dgram: false,
        dns: false,
        module: false,
        readline: false,
        repl: false,
        string_decoder: false,
        sys: false,
        tty: false,
        v8: false,
        worker: false,
      };

      // Handle node: prefixed modules that 0G SDK uses
      config.resolve.alias = {
        ...config.resolve.alias,
        'node:crypto': false,
        'node:stream': false,
        'node:buffer': false,
        'node:util': false,
        'node:assert': false,
        'node:fs': false,
        'node:path': false,
        'node:os': false,
        'node:http': false,
        'node:https': false,
        'node:url': false,
        'node:querystring': false,
        'node:zlib': false,
        'node:tty': false,
        'node:net': false,
        'node:child_process': false,
        'node:events': false,
        'node:querystring': false,
        'node:domain': false,
        'node:constants': false,
        'node:vm': false,
        'node:cluster': false,
        'node:dgram': false,
        'node:dns': false,
        'node:module': false,
        'node:punycode': false,
        'node:readline': false,
        'node:repl': false,
        'node:string_decoder': false,
        'node:sys': false,
        'node:timers': false,
        'node:tls': false,
        'node:worker_threads': false,
        'node:inspector': false,
        'node:perf_hooks': false,
        'node:async_hooks': false,
      };
    }

    // Add webpack plugins to handle module resolution
    config.plugins.push(
      new (require('webpack')).ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser',
      }),
      // Rewrite node: prefixed imports to handle them properly
      new (require('webpack')).NormalModuleReplacementPlugin(
        /^node:/,
        (resource) => {
          const mod = resource.request.replace(/^node:/, '');
          resource.request = mod;
        }
      )
    );

    return config;
  },
};

module.exports = nextConfig;
