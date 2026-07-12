const orderRepo = require('../../repositories/orderRepo');
const PaymentService = require('../../services/PaymentService');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message) {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.attachments.size) return;

    const order = orderRepo.getByChannel(message.channel.id);
    if (!order || order.status !== 'awaiting_proof') return;
    if (order.user_id !== message.author.id) return;

    const attachment = message.attachments.find((a) => a.contentType?.startsWith('image/'));
    if (!attachment) return;

    await PaymentService.submitProof(message.channel, attachment.url);
  },
};
