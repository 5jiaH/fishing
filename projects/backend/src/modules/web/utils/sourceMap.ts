import * as fs from 'fs';
import * as path from 'path';
import { SourceMapConsumer } from 'source-map';

function getType(data) {
  return Object.prototype.toString.call(data).slice(8, -1).toLowerCase();
}

export function TransfError(stack, mapDirectoryPath) {
  return new Promise(async (resolve, reject) => {
    try {
      // 解析报错文件名/行数/列数
      const [errMessage, ...errTarget] = stack.split('\n');

      console.log(errMessage, errTarget);

      const resultError = [errMessage, errTarget[6]].reduce((total, item) => {
        if (total) return total;
        try {
          const targetArray = item.replace(/(\(|\))/g, '').split(':');
          const column = targetArray[targetArray.length - 1];
          const row = targetArray[targetArray.length - 2];
          const errFilePath = targetArray[targetArray.length - 3];
          if (column && row && errFilePath) {
            total = [column, row, errFilePath];
          }
        } catch (err) {}

        return total;
      }, null);

      if (!resultError) throw Error('');
      const [column, row, errFilePath] = resultError;

      // 报错文件名
      let errFileName = errFilePath.split('/');
      errFileName = errFileName[errFileName.length - 1];

      // const mapDirectoryPath = `./uploads/${updatePath}`; // map文件路径
      let isFindMapFile = false;
      const result = await new Promise((resolve, reject) => {
        fs.readdir(mapDirectoryPath, async (err, files) => {
          if (err) return reject(err);
          const targetMapFile = `${errFileName}.map`;
          // 判断是否有该报错map文件
          if (files.includes(targetMapFile)) {
            isFindMapFile = true;
            const filePath = path.join(mapDirectoryPath, targetMapFile);

            // 读取map文件内容
            const content: any = await new Promise((resolve) => {
              fs.readFile(filePath, 'utf-8', (err, content) => {
                resolve(err || content);
              });
            });

            if (getType(content) === 'error') {
              return reject(content);
            } else {
              const sourceMap = JSON.parse(content);

              // 将map文件里的.改为_ 不然会有特殊错误
              sourceMap.sources = sourceMap.sources.map((source) =>
                source.replace('.', '_'),
              );

              SourceMapConsumer.with(sourceMap, null, (consumer) => {
                // 根据编译后代码行数和列数获取源代码的行数和来源路径
                const { line, source } = consumer.originalPositionFor({
                  line: parseInt(row),
                  column: parseInt(column),
                }) as any;

                // 根据来源路径获取源代码
                const content = (consumer.sourceContentFor(source) || '').split(
                  '\n',
                );
                const beginLine = line - 8;
                const endLine = line + 8;
                let resultContent = '';
                for (let i = beginLine; i <= endLine; i++) {
                  if (i === line - 1) {
                    resultContent += `<p class="error"><b>${i}</b>${content[i].toString()}</p>`;
                  } else {
                    resultContent += `<p><b>${i}</b>${content[i]}<p>`;
                  }
                }
                return resolve({
                  result: resultContent,
                  error: errMessage,
                  file: source,
                });
              });
              // }
            }
          } else {
            reject(new Error(`找不到${errFileName}.map文件`));
          }
        });
      });

      if (!isFindMapFile) {
        reject(new Error(`找不到${errFileName}.map文件`));
      } else {
        resolve(result);
      }
    } catch (err) {
      reject(err);
    }
  });
}
