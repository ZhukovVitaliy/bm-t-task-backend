const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const { NODE_ENV } = process.env;

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Documentation",
      version: "1.0.0",
      description: "Documentation for the API",
    },
    servers: [
      {
        url:
          NODE_ENV === "development"
            ? "http://localhost:3000"
            : "https://bm-t-task-frontend.vercel.app",
      },
    ],
  },
  apis: ["./routes/**/*.js", "./controllers/**/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec,
};
