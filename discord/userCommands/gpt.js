'use strict';

const config = require('config').openai;
const oai = require('openai');
const { fqUrlFromPath } = require('../../util');
const { servePage, isHTTPRunning } = require('../common');

require('../../logger')('discord');

async function f (context, ...a) {
  if (!config.secretKey) {
    return 'You must specify your secret key in `config.openai.secretKey`!';
  }

  let error = 'Unknown error';
  try {
    const prompt = context.argObj._.join(' ');
    const model = context.options.model ?? config.model;
    const temperature = context.options.temperature ?? config.temperature;
    const max_tokens = context.options.maxTokens ?? config.maxTokens; // eslint-disable-line camelcase
    const dataObj = {
      model,
      prompt,
      temperature,
      max_tokens
    };

    const startTime = new Date();
    context.sendToBotChan('Querying OpenAI...');
    const res = await (new oai.OpenAIApi(new oai.Configuration({
      apiKey: config.secretKey
    }))).createCompletion(dataObj);
    const queryTimeS = Number((new Date() - startTime) / 1000).toFixed(1);
    context.sendToBotChan(`OpenAI query took ${queryTimeS} seconds`);

    dataObj.response = res.data?.choices?.[0]?.text ?? res.data?.choices ?? res.data;
    if (await isHTTPRunning(context.registerOneTimeHandler, context.removeOneTimeHandler)) {
      const serveObj = {
        ...dataObj,
        queryTimeS,
        response: dataObj.response
          .replaceAll(/^\s+/g, '')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('\n', '\n<br/>')
      };
      if (!context.options.ttl) {
        context.options.ttl = -1;
      }
      const page = await servePage(context, serveObj, 'gpt');
      context.sendToBotChan(`This response is also available at ${fqUrlFromPath(page)}`);
    }

    return dataObj.response;
  } catch (e) {
    error = e.response.data?.error?.message ?? e.message;
  }

  return 'ERROR: ' + error;
}

f.__drcHelp = () => ({
  title: 'An interface to ChatGPT',
  usage: '<options> [prompt]',
  notes: 'Options:\n`--model`: Change model\n`--maxTokens`: Set max tokens\n`--temperature`: Set temperature.\n\nRun `!config get openai` to see defaults.'
});

module.exports = f;
