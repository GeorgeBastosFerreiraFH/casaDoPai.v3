import pkg from "pg";
import dotenv from "dotenv";

const { Pool } = pkg;
dotenv.config();

class DatabaseManager {
  constructor() {
    this.config = {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 5432, // O PostgreSQL geralmente usa 5432 como porta padrão
      ssl: {
        rejectUnauthorized: false, // Configuração de SSL
      },
      max: 10, // Tamanho máximo do pool de conexões
      idleTimeoutMillis: 30000, // Tempo de espera para encerrar conexões inativas
      connectionTimeoutMillis: 2000, // Tempo máximo para aguardar uma conexão
    };

    this.pool = new Pool(this.config); // Usando o Pool de conexões do PostgreSQL
    this.retryAttempts = 3;
    this.retryDelay = 5000; // 5 segundos
    this.initialize();
  }

  async initialize() {
    try {
      await this.testConnection();
      this.setupPeriodicConnectionTest();
    } catch (error) {
      console.error("Erro na inicialização do banco de dados:", error);
      await this.handleInitializationError(error);
    }
  }

  async testConnection() {
    try {
      const client = await this.pool.connect();
      console.log(
        "Conexão ao banco de dados PostgreSQL estabelecida com sucesso!"
      );

      // Testar uma query simples
      await client.query("SELECT 1");
      client.release();
      return true;
    } catch (error) {
      console.error("Erro ao testar conexão:", error);
      throw error;
    }
  }

  setupPeriodicConnectionTest() {
    // Testar conexão a cada 5 minutos
    setInterval(async () => {
      try {
        await this.testConnection();
      } catch (error) {
        console.error("Erro no teste periódico de conexão:", error);
      }
    }, 5 * 60 * 1000);
  }

  async executeQuery(query, params = []) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, params);
      return result.rows; // PostgreSQL retorna dados na chave `rows`
    } catch (error) {
      console.error("Erro na execução da query:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async executeTransaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN"); // Inicia a transação
      const result = await callback(client);
      await client.query("COMMIT"); // Confirma a transação
      return result;
    } catch (error) {
      await client.query("ROLLBACK"); // Reverte a transação em caso de erro
      throw error;
    } finally {
      client.release();
    }
  }

  async handleInitializationError(error) {
    console.error("Erro na inicialização do banco de dados:", error);
    throw error;
  }

  async closePool() {
    try {
      await this.pool.end();
      console.log("Pool de conexões encerrado com sucesso");
    } catch (error) {
      console.error("Erro ao encerrar pool de conexões:", error);
      throw error;
    }
  }
}

const databaseManager = new DatabaseManager();

// Configurar manipulador de eventos de processo
process.on("SIGINT", async () => {
  console.log("Encerrando aplicação...");
  try {
    await databaseManager.closePool();
    process.exit(0);
  } catch (error) {
    console.error("Erro ao encerrar aplicação:", error);
    process.exit(1);
  }
});

export default databaseManager.pool;
