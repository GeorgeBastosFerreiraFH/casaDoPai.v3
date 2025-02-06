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
    // Configurações de segurança
    this.app.use(helmet());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // limite de 100 requisições por IP
    });
    this.app.use(limiter);

    // Middleware padrão
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Configurar diretório estático
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
      const { rows } = await pool.query(query, params); // Método query do pg
      return rows;
    } catch (error) {
      console.error("Erro na execução da query:", error);
      throw new Error("Erro ao executar operação no banco de dados");
    }
  }

  async validateUser(email, senha) {
    const users = await this.executeQuery(
      "SELECT * FROM usuarios WHERE email = $1", // Sintaxe PostgreSQL com $1 para placeholders
      [email]
    );

    if (users.length === 0) {
      throw new Error("Email não cadastrado");
    }

    const isValid = await bcrypt.compare(senha, users[0].senhaCadastro);
    if (!isValid) {
      throw new Error("Senha inválida");
    }

    return users[0];
  }

  setupRoutes() {
    // Rota de Recuperação de Senha
    this.app.post("/recuperar-senha", async (req, res) => {
      try {
        const { email } = req.body;
        const users = await this.executeQuery(
          "SELECT * FROM usuarios WHERE email = ?",
          [email]
        );

        if (users.length === 0) {
          return res.status(404).json({ error: "E-mail não encontrado" });
        }

        const token = this.generateToken();
        await this.executeQuery(
          "UPDATE usuarios SET tokenRecuperacao = ? WHERE email = ?",
          [token, email]
        );

        const mailOptions = {
          from: "ge.be.web.design@gmail.com",
          to: email,
          subject: "Recuperação de Senha",
          text: `Clique no link para redefinir sua senha: http://localhost:3000/redefinir-senha?token=${token}`,
        };

        await this.transporter.sendMail(mailOptions);
        res.status(200).json({ message: "E-mail enviado com sucesso" });
      } catch (error) {
        console.error("Erro ao processar recuperação de senha:", error);
        res.status(500).json({ error: "Erro ao processar solicitação" });
      }
    });

    // Rota de Login
    this.app.post("/login", async (req, res) => {
      try {
        const { email, senha } = req.body;

        if (email === "Administrador") {
          if (senha !== "Password321@") {
            return res.status(401).json({ error: "Senha inválida" });
          }
          return res.status(200).json({
            usuario: {
              id: null,
              nome: "Administrador",
              tipoUsuario: "Administrador",
              idCelula: null,
            },
          });
        }

        const user = await this.validateUser(email, senha);
        res.status(200).json({
          usuario: {
            id: user.id,
            nome: user.nomeCompleto,
            tipoUsuario: user.tipoUsuario,
            idCelula: user.idCelula,
          },
        });
      } catch (error) {
        res.status(401).json({ error: error.message });
      }
    });

    // Rota para listar Celulas
    this.app.get("/celulas", async (req, res) => {
      try {
        const celulas = await this.executeQuery("SELECT * FROM celulas");
        res.status(200).json(celulas);
      } catch (error) {
        res.status(500).json({ error: "Erro ao buscar células" });
      }
    });

    // Rota para listar usuários
    this.app.get("/usuarios", async (req, res) => {
      try {
        const users = await this.executeQuery(`
                    SELECT u.*, c.nomeCelula 
                    FROM usuarios u 
                    LEFT JOIN celulas c ON u.idCelula = c.id
                `);
        res.status(200).json(users);
      } catch (error) {
        res.status(500).json({ error: "Erro ao buscar usuários" });
      }
    });

    // Rota para buscar usuários de uma célula
    this.app.get("/celulas/:idCelula/usuarios", async (req, res) => {
      try {
        const { idCelula } = req.params;
        const users = await this.executeQuery(
          `
                    SELECT u.*, c.nomeCelula 
                    FROM usuarios u 
                    LEFT JOIN celulas c ON u.idCelula = c.id 
                    WHERE u.idCelula = ? AND u.tipoUsuario = 'UsuarioComum'
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

    // Rota para buscar usuário específico
    this.app.get("/usuarios/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const users = await this.executeQuery(
          `
                    SELECT u.*, c.nomeCelula, l.nomeCompleto AS nomeLider 
                    FROM usuarios u
                    LEFT JOIN celulas c ON u.idCelula = c.id
                    LEFT JOIN usuarios l ON u.idLiderCelula = l.id
                    WHERE u.id = ?
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

    // Rota para cadastrar usuário
    this.app.post("/usuarios", async (req, res) => {
      try {
        const {
          nomeCompleto,
          dataNascimento,
          email,
          telefone,
          senha,
          tipoUsuario,
          concluiuBatismo,
          participouCafe,
          participaMinisterio,
          nomeMinisterio,
          idCelula,
          participaCelula,
          ...cursos
        } = req.body;

        // Validar dados
        if (!nomeCompleto || !email || !senha) {
          return res
            .status(400)
            .json({ error: "Campos obrigatórios não preenchidos" });
        }

        // Verificar email único
        const existingUser = await this.executeQuery(
          "SELECT id FROM usuarios WHERE email = ?",
          [email]
        );
        if (existingUser.length > 0) {
          return res.status(400).json({ error: "Email já cadastrado" });
        }

        const hashedPassword = await bcrypt.hash(senha, 10);

        const result = await this.executeQuery(
          `
                    INSERT INTO usuarios 
                    SET ?
                `,
          [
            {
              nomeCompleto,
              dataNascimento,
              email,
              telefone,
              senhaCadastro: hashedPassword,
              tipoUsuario: tipoUsuario || "UsuarioComum",
              concluiuBatismo: !!concluiuBatismo,
              participouCafe: !!participouCafe,
              participaMinisterio: !!participaMinisterio,
              nomeMinisterio,
              idCelula,
              participaCelula: !!participaCelula,
              ...cursos,
            },
          ]
        );

        res.status(201).json({
          message: "Usuário cadastrado com sucesso",
          id: result.insertId,
        });
      } catch (error) {
        res.status(500).json({ error: "Erro ao cadastrar usuário" });
      }
    });

    // Rota para atualizar usuário
    this.app.put("/usuarios/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const updateData = { ...req.body };

        if (updateData.senha) {
          updateData.senhaCadastro = await bcrypt.hash(updateData.senha, 10);
          delete updateData.senha;
        }

        // Verificar se o idCelula foi fornecido e é válido
        if (updateData.idCelula) {
          const celula = await this.executeQuery(
            "SELECT id FROM celulas WHERE id = ?",
            [updateData.idCelula]
          );
          if (celula.length === 0) {
            return res.status(400).json({ error: "Célula inválida" });
          }
        }

        const result = await this.executeQuery(
          "UPDATE usuarios SET ? WHERE id = ?",
          [updateData, id]
        );

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Usuário não encontrado" });
        }

        res.status(200).json({ message: "Usuário atualizado com sucesso" });
      } catch (error) {
        res.status(500).json({ error: "Erro ao atualizar usuário" });
      }
    });

    // Rota para deletar usuário
    this.app.delete("/usuarios/:id", async (req, res) => {
      try {
        const { id } = req.params;

        // Deletar referências primeiro
        await this.executeQuery(
          "DELETE FROM usuarios_celulas WHERE idUsuario = ?",
          [id]
        );
        await this.executeQuery(
          "DELETE FROM usuarios_ministerios WHERE idUsuario = ?",
          [id]
        );
        await this.executeQuery(
          "DELETE FROM lideres_celulas WHERE idLiderCelula = ?",
          [id]
        );

        const result = await this.executeQuery(
          "DELETE FROM usuarios WHERE id = ?",
          [id]
        );

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Usuário não encontrado" });
        }

        res.status(200).json({ message: "Usuário deletado com sucesso" });
      } catch (error) {
        res.status(500).json({ error: "Erro ao deletar usuário" });
      }
    });

    // Rota para tornar usuário líder
    this.app.put("/usuarios/:id/tornar-lider", async (req, res) => {
      try {
        const { id } = req.params;

        const user = await this.executeQuery(
          "SELECT * FROM usuarios WHERE id = ?",
          [id]
        );
        if (user.length === 0) {
          return res.status(404).json({ error: "Usuário não encontrado" });
        }

        const currentUser = user[0];

        if (currentUser.tipoUsuario === "LiderCelula") {
          return res
            .status(400)
            .json({ error: "Usuário já é líder de célula" });
        }

        if (!currentUser.idCelula) {
          return res
            .status(400)
            .json({ error: "O usuário não está associado a nenhuma célula" });
        }

        await this.executeQuery(
          "UPDATE usuarios SET tipoUsuario = ? WHERE id = ?",
          ["LiderCelula", id]
        );
        await this.executeQuery(
          "INSERT INTO lideres_celulas (idLiderCelula, idCelula, dataInicio) VALUES (?, ?, CURDATE())",
          [id, currentUser.idCelula]
        );

        res
          .status(200)
          .json({ message: "Usuário promovido a líder com sucesso" });
      } catch (error) {
        res.status(500).json({ error: "Erro ao promover usuário a líder" });
      }
    });

    // Rota para rebaixar líder
    this.app.put("/usuarios/:id/rebaixar-lider", async (req, res) => {
      try {
        const { id } = req.params;

        const user = await this.executeQuery(
          "SELECT * FROM usuarios WHERE id = ? AND tipoUsuario = ?",
          [id, "LiderCelula"]
        );

        if (user.length === 0) {
          return res.status(404).json({ error: "Líder não encontrado" });
        }

        await this.executeQuery(
          "UPDATE usuarios SET tipoUsuario = ? WHERE id = ?",
          ["UsuarioComum", id]
        );
        await this.executeQuery(
          "DELETE FROM lideres_celulas WHERE idLiderCelula = ?",
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
