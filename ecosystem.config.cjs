module.exports = {
    apps: [
        {
            name: "lets-connect-server",
            script: "./index.js",
            instances: "max",
            exec_mode: "cluster",
            env: {
                NODE_ENV: "development",
            },
            env_production: {
                NODE_ENV: "production",
            },
        },
    ],
};
