const express = require('express');
const clientes = require('../controllers/clientesController');
const servicos = require('../controllers/servicosController');
const bloqueios = require('../controllers/bloqueiosController');
const sistema = require('../controllers/sistemaController');
const pagamentos = require('../controllers/pagamentosController');
const publico = require('../controllers/publicoController');
const repasses = require('../controllers/repassesController');
const whatsapp = require('../controllers/whatsappController');
const produto = require('../controllers/produtoController');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

router.get('/admin/status', adminAuth.statusAdmin);
router.post('/admin/login', adminAuth.loginAdmin);
router.post('/admin/logout', adminAuth.exigirAdmin, adminAuth.logoutAdmin);

router.get('/clientes', adminAuth.exigirAdmin, clientes.listar);
router.get('/clientes/:id', adminAuth.exigirAdmin, clientes.buscar);
router.post('/clientes', adminAuth.exigirAdmin, clientes.criar);
router.patch('/clientes/:id', adminAuth.exigirAdmin, clientes.atualizar);
router.delete('/clientes/:id', adminAuth.exigirAdmin, clientes.remover);

router.get('/servicos', servicos.listar);
router.get('/servicos/:id', servicos.buscar);
router.post('/servicos', adminAuth.exigirAdmin, servicos.criar);
router.patch('/servicos/:id', adminAuth.exigirAdmin, servicos.atualizar);

router.use('/agendamentos', adminAuth.exigirAdmin, require('./agendamentosRoutes'));

router.get('/pagamentos', adminAuth.exigirAdmin, pagamentos.listar);
router.get('/pagamentos/:id', adminAuth.exigirAdmin, pagamentos.buscar);
router.post('/pagamentos/manual', adminAuth.exigirAdmin, pagamentos.registrarManual);
router.post('/pagamentos/asaas', adminAuth.exigirAdmin, pagamentos.criarAsaas);
router.post('/agendamentos/:agendamentoId/pagamentos/asaas', adminAuth.exigirAdmin, pagamentos.criarAsaas);
router.get('/repasses', adminAuth.exigirAdmin, repasses.listar);
router.post('/repasses/asaas', adminAuth.exigirAdmin, repasses.criar);

router.get('/bloqueios', adminAuth.exigirAdmin, bloqueios.listar);
router.post('/bloqueios', adminAuth.exigirAdmin, bloqueios.criar);
router.delete('/bloqueios/:id', adminAuth.exigirAdmin, bloqueios.remover);

router.post('/webhooks/asaas', pagamentos.webhookAsaas);
router.get('/webhooks/whatsapp', whatsapp.verificarWebhook);
router.post('/webhooks/whatsapp', whatsapp.receberWebhook);

router.get('/publico', sistema.infoPublica);
router.get('/produto', produto.info);
router.post('/publico/agendamentos', publico.agendar);
router.get('/disponibilidade', sistema.disponibilidade);
router.get('/disponibilidade/grade', sistema.gradeDisponibilidade);
router.get('/disponibilidade/horarios', sistema.horariosDisponiveis);
router.get('/lembretes/retorno', adminAuth.exigirAdmin, sistema.lembretesRetorno);
router.get('/resumo', adminAuth.exigirAdmin, sistema.resumo);
router.get('/configuracoes', adminAuth.exigirAdmin, sistema.buscarConfiguracoes);
router.patch('/configuracoes', adminAuth.exigirAdmin, sistema.atualizarConfiguracoes);
router.get('/configuracoes/negocio', adminAuth.exigirAdmin, sistema.buscarNegocio);
router.patch('/configuracoes/negocio', adminAuth.exigirAdmin, sistema.atualizarNegocio);

module.exports = router;
