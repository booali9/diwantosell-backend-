"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_1 = __importDefault(require("./app"));
const db_1 = __importDefault(require("./config/db"));
const liquidationWorker_1 = require("./utils/liquidationWorker");
const PORT = process.env.PORT || 5000;
// Connect to database
(0, db_1.default)();
console.log(`[DEBUG] Attempting to listen on port ${PORT}...`);
app_1.default.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    (0, liquidationWorker_1.startLiquidationWorker)();
});
// Export for Vercel serverless
exports.default = app_1.default;
