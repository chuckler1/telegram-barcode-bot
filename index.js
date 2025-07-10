const { Telegraf, Markup } = require('telegraf');
const config = require('./config');
const bwipjs = require('bwip-js');
const fs = require('fs');
const path = require('path');

// Создаём экземпляр бота
const bot = new Telegraf(config.BOT_TOKEN);

// Добавляем middleware для логирования всех сообщений
bot.use((ctx, next) => {
  const messageText = ctx.message?.text || 'неизвестно';
  console.log(
    `📨 Получено сообщение: "${messageText}" от ${
      ctx.from?.first_name || 'неизвестный пользователь'
    }`
  );
  return next();
});

// Обработчик команды /start
bot.start((ctx) => {
  ctx.reply(
    'Привет! Я бот для генерации штрих-кодов!',
    Markup.inlineKeyboard([
      [Markup.button.callback('Сгенерировать штрих-код', 'GEN_BARCODE')],
      [Markup.button.callback('Помощь', 'help')],
    ])
  );
});

// Обработчик команды /help
bot.action('GEN_BARCODE', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.reply('Введите число для генерации штрих-кода:');
});

bot.action('help', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.reply(
    'Как использовать бота:\n\n📱 Просто отправь любое число (например: 123456789)'
  );
});

// Функция генерации штрих-кода
async function generateBarcode(text) {
  return await bwipjs.toBuffer({
    bcid: 'code128', // Тип штрих-кода
    text: text, // Текст для кодирования
    scale: 5, // Увеличенный масштаб для лучшего качества
    height: 15, // Увеличенная высота
    includetext: true, // Включить текст под штрих-кодом
    textxalign: 'center', // Выравнивание текста
    textsize: 12, // Размер текста
    textfont: 'Arial', // Шрифт текста
    padding: 10, // Отступы вокруг штрих-кода
    backgroundcolor: 'FFFFFF', // Белый фон
    barcolor: '000000', // Чёрные полоски
    textcolor: '000000', // Чёрный текст
    sizelimit: '100x100', // Минимальный размер
    resolution: 300, // Высокое разрешение (DPI)
  });
}

// Обработчик обычных сообщений
bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();

  // Проверяем, является ли сообщение числом
  if (/^\d+$/.test(text)) {
    try {
      ctx.reply('Генерирую штрих-код...');

      const barcodeBuffer = await generateBarcode(text);
      const filename = `barcode_${text}_${Date.now()}.png`;
      const filepath = path.join(__dirname, filename);

      // Сохраняем файл временно
      fs.writeFileSync(filepath, barcodeBuffer);

      // Отправляем изображение
      await ctx.replyWithPhoto(
        { source: filepath },
        {
          caption: `Штрих-код для числа: ${text}`,
        }
      );

      // Удаляем временный файл
      fs.unlinkSync(filepath);
    } catch (error) {
      console.error('Ошибка при генерации штрих-кода:', error);
      ctx.reply(
        'Произошла ошибка при генерации штрих-кода. Попробуйте ещё раз.'
      );
    }
  } else {
    // Если это не число, отвечаем как обычно
    ctx.reply(`Вы написали не число: "${text}". Пожалуйста, отправьте число.`);
  }
});

// Обработчик ошибок
bot.catch((err, ctx) => {
  console.error(`❌ Ошибка для ${ctx.updateType}:`, err);
  console.error('🔍 Детали:', err.message);
});

// Запускаем бота
console.log('🚀 Запускаю бота...');
console.log('🔑 Токен:', config.BOT_TOKEN.substring(0, 10) + '...');

// Проверяем подключение перед запуском
bot.telegram
  .getMe()
  .then((botInfo) => {
    console.log('✅ Подключение к Telegram API успешно!');
    console.log('🤖 Бот:', botInfo.first_name, `(@${botInfo.username})`);

    // Запускаем бота после успешной проверки
    return bot.launch();
  })
  .then(() => {
    console.log('🤖 Бот успешно запущен!');
    console.log('📱 Отправьте боту любое число для генерации штрих-кода');
    console.log('⏹️  Для остановки нажмите Ctrl+C');
  })
  .catch((err) => {
    console.error('❌ Ошибка при запуске бота:', err);
    console.error('🔍 Детали ошибки:', err.message);
    if (err.code) {
      console.error('📋 Код ошибки:', err.code);
    }
    process.exit(1);
  });

// Включаем graceful stop
process.once('SIGINT', () => {
  console.log('\n🛑 Получен сигнал остановки...');
  bot.stop('SIGINT');
  console.log('✅ Бот успешно остановлен');
  process.exit(0);
});

process.once('SIGTERM', () => {
  console.log('\n🛑 Получен сигнал завершения...');
  bot.stop('SIGTERM');
  console.log('✅ Бот успешно остановлен');
  process.exit(0);
});
