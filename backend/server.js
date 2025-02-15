import express from "express";
import pool from "./db.js";
import bcrypt from "bcrypt";
import cors from "cors";
import path from "path";
import nodemailer from "nodemailer";
import { fileURLToPath } from "url";
import { dirname } from "path";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import dotenv from "dotenv";
dotenv.config();

class ServerManager {
  constructor() {
    this.app = express();
    this.PORT = process.env.PORT;
    this.configureMiddleware();
    this.configureEmail();
    this.setupRoutes();
    this.startServer();
  }

  configureMiddleware() {
    this.app.use(helmet());

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
    });
    this.app.use(limiter);

    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    this.app.use(express.static(path.join(__dirname, "..")));
  }

  configureEmail() {
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: "ge.be.web.design@gmail.com",
        pass: "wkol dvoq roeu ceid",
      },
    });
  }

  async executeQuery(query, params = []) {
    try {
      const { rows } = await pool.query(query, params);
      return rows;
    } catch (error) {
      console.error("Erro na execução da query:", error);
      throw new Error("Erro ao executar operação no banco de dados");
    }
  }

  async validateUser(email, senha) {
    const users = await this.executeQuery(
      "SELECT * FROM usuarios WHERE email = $1",
      [email]
    );

    if (users.length === 0) {
      throw new Error("Email não cadastrado");
    }

    const isValid = await bcrypt.compare(senha, users[0].senhacadastro);
    if (!isValid) {
      throw new Error("Senha inválida");
    }

    return users[0];
  }

  setupRoutes() {
    this.app.post("/recuperar-senha", async (req, res) => {
      try {
        const { email } = req.body;
        const users = await this.executeQuery(
          "SELECT * FROM usuarios WHERE email = $1",
          [email]
        );

        if (users.length === 0) {
          return res.status(404).json({ error: "E-mail não encontrado" });
        }

        const token = this.generateToken();
        await this.executeQuery(
          "UPDATE usuarios SET tokenrecuperacao = $1 WHERE email = $2",
          [token, email]
        );

        const mailOptions = {
          from: "ge.be.web.design@gmail.com",
          to: email,
          subject: "Recuperação de Senha",
          text: `Clique no link para redefinir sua senha: https://casadopai-v3.onrender.com/redefinir-senha?token=${token}`,
        };

        await this.transporter.sendMail(mailOptions);
        res.status(200).json({ message: "E-mail enviado com sucesso" });
      } catch (error) {
        console.error("Erro ao processar recuperação de senha:", error);
        res.status(500).json({ error: "Erro ao processar solicitação" });
      }
    });

    this.app.post("/login", async (req, res) => {
      try {
        const { email, senha } = req.body;

        const user = await this.validateUser(email, senha);

        res.status(200).json({
          usuario: {
            id: user.id,
            nome: user.nomecompleto,
            tipousuario: user.tipousuario,
            idcelula: user.idcelula,
          },
        });
      } catch (error) {
        res.status(401).json({ error: error.message });
      }
    });

    this.app.get("/celulas", async (req, res) => {
      try {
        const celulas = await this.executeQuery("SELECT * FROM celulas");
        res.status(200).json(celulas);
      } catch (error) {
        res.status(500).json({ error: "Erro ao buscar células" });
      }
    });

    this.app.get("/usuarios", async (req, res) => {
      try {
        const users = await this.executeQuery(`
          SELECT u.*, c.nomecelula 
          FROM usuarios u 
          LEFT JOIN celulas c ON u.idcelula = c.id
        `);
        res.status(200).json(users);
      } catch (error) {
        res.status(500).json({ error: "Erro ao buscar usuários" });
      }
    });

    this.app.get("/celulas/:idCelula/usuarios", async (req, res) => {
      try {
        const { idCelula } = req.params;
        const users = await this.executeQuery(
          `
          SELECT u.*, c.nomecelula 
          FROM usuarios u 
          LEFT JOIN celulas c ON u.idcelula = c.id 
          WHERE u.idcelula = $1 AND u.tipousuario = 'UsuarioComum'
          `,
          [idCelula]
        );

        if (users.length === 0) {
          return res
            .status(404)
            .json({ error: "Nenhum usuário encontrado para esta célula" });
        }
        res.status(200).json(users);
      } catch (error) {
        res.status(500).json({ error: "Erro ao buscar usuários da célula" });
      }
    });

    this.app.get("/usuarios/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const users = await this.executeQuery(
          `
          SELECT u.*, c.nomecelula, l.nomecompleto AS nomelider 
          FROM usuarios u
          LEFT JOIN celulas c ON u.idcelula = c.id
          LEFT JOIN usuarios l ON u.idlidercelula = l.id
          WHERE u.id = $1
          `,
          [id]
        );

        if (users.length === 0) {
          return res.status(404).json({ error: "Usuário não encontrado" });
        }
        res.status(200).json(users[0]);
      } catch (error) {
        res.status(500).json({ error: "Erro ao buscar usuário" });
      }
    });

    this.app.post("/usuarios", async (req, res) => {
      try {
        const {
          nomecompleto,
          datanascimento,
          email,
          telefone,
          senha,
          concluiubatismo,
          participoucafe,
          participaministerio,
          idcelula,
          participacelula,
          nomeministerio,
          cursomeunovocaminho,
          cursovidadevocional,
          cursofamiliacrista,
          cursovidaprosperidade,
          cursoprincipiosautoridade,
          cursovidaespirito,
          cursocaratercristo,
          cursoidentidadesrestauradas,
        } = req.body;

        console.log("Dados recebidos para cadastro:", req.body);

        if (!nomecompleto || !email || !senha) {
          return res
            .status(400)
            .json({ error: "Campos obrigatórios não preenchidos" });
        }

        if (idcelula === "Qual célula:") {
          return res.status(400).json({ error: "Célula inválida" });
        }

        const existingUser = await this.executeQuery(
          "SELECT id FROM usuarios WHERE email = $1",
          [email]
        );
        if (existingUser.length > 0) {
          return res.status(400).json({ error: "Email já cadastrado" });
        }

        const hashedPassword = await bcrypt.hash(senha, 10);

        const result = await this.executeQuery(
          `
          INSERT INTO usuarios 
          (nomecompleto, datanascimento, email, telefone, senhacadastro, 
           tipoUsuario, concluiuBatismo, participouCafe, participaMinisterio, 
           idcelula, participacelula, nomeministerio, cursomeunovocaminho, 
           cursovidadevocional, cursofamiliacrista, cursovidaprosperidade, 
           cursoprincipiosautoridade, cursovidaespirito, cursocaratercristo, 
           cursoidentidadesrestauradas)
          VALUES ($1, $2, $3, $4, $5, 'UsuarioComum', $6, $7, $8, $9, $10, $11, 
                  $12, $13, $14, $15, $16, $17, $18, $19)
          RETURNING id
          `,
          [
            nomecompleto,
            datanascimento,
            email,
            telefone,
            hashedPassword,
            !!concluiubatismo,
            !!participoucafe,
            !!participaministerio,
            idcelula,
            !!participacelula,
            nomeministerio,
            !!cursomeunovocaminho,
            !!cursovidadevocional,
            !!cursofamiliacrista,
            !!cursovidaprosperidade,
            !!cursoprincipiosautoridade,
            !!cursovidaespirito,
            !!cursocaratercristo,
            !!cursoidentidadesrestauradas,
          ]
        );

        console.log("Usuário cadastrado com sucesso:", result);

        res.status(201).json({
          message: "Usuário cadastrado com sucesso",
          id: result[0].id,
        });
      } catch (error) {
        console.error("Erro ao cadastrar usuário:", error);
        res.status(500).json({ error: "Erro ao cadastrar usuário" });
      }
    });

    this.app.put("/usuarios/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const updateData = { ...req.body };

        if (updateData.senha) {
          updateData.senhacadastro = await bcrypt.hash(updateData.senha, 10);
          delete updateData.senha;
        }

        if (updateData.idcelula) {
          const celula = await this.executeQuery(
            "SELECT id FROM celulas WHERE id = $1",
            [updateData.idcelula]
          );
          if (celula.length === 0) {
            return res.status(400).json({ error: "Célula inválida" });
          }
        }

        const fields = Object.keys(updateData);
        const values = Object.values(updateData);
        const setClause = fields
          .map((field, index) => `${field} = $${index + 1}`)
          .join(", ");

        const result = await this.executeQuery(
          `UPDATE usuarios SET ${setClause} WHERE id = $${
            fields.length + 1
          } RETURNING *`,
          [...values, id]
        );

        if (result.length === 0) {
          return res.status(404).json({ error: "Usuário não encontrado" });
        }

        res.status(200).json({ message: "Usuário atualizado com sucesso" });
      } catch (error) {
        res.status(500).json({ error: "Erro ao atualizar usuário" });
      }
    });

    this.app.delete("/usuarios/:id", async (req, res) => {
      try {
        const { id } = req.params;

        await this.executeQuery(
          "DELETE FROM usuarios_celulas WHERE idusuario = $1",
          [id]
        );
        await this.executeQuery(
          "DELETE FROM usuarios_ministerios WHERE idusuario = $1",
          [id]
        );
        await this.executeQuery(
          "DELETE FROM lideres_celulas WHERE idlidercelula = $1",
          [id]
        );

        const result = await this.executeQuery(
          "DELETE FROM usuarios WHERE id = $1 RETURNING *",
          [id]
        );

        if (result.length === 0) {
          return res.status(404).json({ error: "Usuário não encontrado" });
        }

        res.status(200).json({ message: "Usuário deletado com sucesso" });
      } catch (error) {
        res.status(500).json({ error: "Erro ao deletar usuário" });
      }
    });

    this.app.put("/usuarios/:id/tornar-lider", async (req, res) => {
      try {
        const { id } = req.params;

        const user = await this.executeQuery(
          "SELECT * FROM usuarios WHERE id = $1",
          [id]
        );
        if (user.length === 0) {
          return res.status(404).json({ error: "Usuário não encontrado" });
        }

        const currentUser = user[0];

        if (currentUser.tipousuario === "LiderCelula") {
          return res
            .status(400)
            .json({ error: "Usuário já é líder de célula" });
        }

        if (!currentUser.idcelula) {
          return res
            .status(400)
            .json({ error: "O usuário não está associado a nenhuma célula" });
        }

        await this.executeQuery(
          "UPDATE usuarios SET tipousuario = $1 WHERE id = $2",
          ["LiderCelula", id]
        );
        await this.executeQuery(
          "INSERT INTO lideres_celulas (idlidercelula, idcelula, datainicio) VALUES ($1, $2, CURRENT_DATE)",
          [id, currentUser.idcelula]
        );

        res
          .status(200)
          .json({ message: "Usuário promovido a líder com sucesso" });
      } catch (error) {
        res.status(500).json({ error: "Erro ao promover usuário a líder" });
      }
    });

    this.app.put("/usuarios/:id/rebaixar-lider", async (req, res) => {
      try {
        const { id } = req.params;

        const user = await this.executeQuery(
          "SELECT * FROM usuarios WHERE id = $1 AND tipousuario = $2",
          [id, "LiderCelula"]
        );

        if (user.length === 0) {
          return res.status(404).json({ error: "Líder não encontrado" });
        }

        await this.executeQuery(
          "UPDATE usuarios SET tipousuario = $1 WHERE id = $2",
          ["UsuarioComum", id]
        );
        await this.executeQuery(
          "DELETE FROM lideres_celulas WHERE idlidercelula = $1",
          [id]
        );

        res.status(200).json({ message: "Líder rebaixado com sucesso" });
      } catch (error) {
        res.status(500).json({ error: "Erro ao rebaixar líder" });
      }
    });
  }

  generateToken() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  startServer() {
    this.app.listen(this.PORT, () => {
      console.log(`Servidor rodando na porta ${this.PORT}`);
    });
  }
}

new ServerManager();
