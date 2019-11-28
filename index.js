const inquirer = require('inquirer');
const shelljs = require('shelljs');
const fs = require('fs');

const ANSI_COLOR_MAP = {
  RED: '\u001b[31;1m',
  GREEN: '\u001b[32;1m',
  YELLOW: '\u001b[33;1m',
  BLUE: '\u001b[34;1m',
};

class ServiceCreator {
  static checkNameValidator(name) {
    // check validity by acceptable pattern
    const pattern = /^([a-z\-\d])+$/;
    if (!pattern.test(name)) {
      return 'Project name may only includes lower case letters, numbers and hashes. (kebab-case)';
    }

    // check service name uniqueness
    const currentDirectories = fs.readdirSync(__dirname);
    if (currentDirectories.includes(name)) {
      return 'The current folder includes a directory or file with such name. The name should be unique.';
    }

    return true;
  }

  constructor() {
    this.currentDirectory = process.cwd();
    this.baseTemplatePath = `${__dirname}/templates/base-service-template`;
    this.contentToIgnore = ['node_modules', 'package.json'];
  }

  async createService() {
    const serviceConfig = await this.promptServiceConfig();
    if (!serviceConfig) {
      this.log('Config was not provided.', ANSI_COLOR_MAP.RED);
      return;
    }

    const { serviceName } = serviceConfig;
    this.createNewServiceFromTemplate(serviceConfig);
    await this.installDependencies(serviceName);
    this.log(`A new service "${serviceName}" service has been successfully created!`, ANSI_COLOR_MAP.GREEN);
  }

  /**
   * @param  {string} serviceName
   */
  installDependencies(serviceName) {
    return new Promise((res, rej) => {
      shelljs.cd(`./${serviceName}`);
      shelljs.exec('npm i', (status) => {
        if (status === 0) {
          // eslint-disable-next-line no-console
          this.log('All dependencies were successfully installed!', ANSI_COLOR_MAP.GREEN);
          res();
        } else {
          // eslint-disable-next-line no-console
          this.log('Something went wrong while dependencies installation.', ANSI_COLOR_MAP.RED);
          rej();
        }
      });
      this.log('Installing dependencies in progress...', ANSI_COLOR_MAP.YELLOW);
    });
  }

  /**
   * @return  {Object} serviceConfig - Service config received from inquirer
   */
  async promptServiceConfig() {
    const questions = [
      {
        name: 'serviceName',
        type: 'input',
        message: 'Service name:',
        validate: (input) => ServiceCreator.checkNameValidator(input),
      },
      {
        name: 'author',
        type: 'input',
        message: 'Author name:',
      },
      {
        name: 'license',
        type: 'input',
        message: 'License type:',
      },
    ];
    return inquirer.prompt(questions);
  }

  /**
   * @param  {Object} serviceConfig
   */
  createNewServiceFromTemplate(serviceConfig) {
    const servicePath = serviceConfig.serviceName;
    const filesToCreate = fs.readdirSync(this.baseTemplatePath)
      .filter((file) => !this.contentToIgnore.includes(file));
    const baseServicePath = `${this.currentDirectory}/${servicePath}/`;
    const packageJSON = this.generatePackageJSON(serviceConfig);

    // create folder for new service and configure package.json
    fs.mkdirSync(servicePath);
    fs.writeFileSync(`${baseServicePath}/package.json`, packageJSON, 'utf8');

    // copy all files and directories from service template
    filesToCreate.forEach((file) => {
      const originalFilePath = `${this.baseTemplatePath}/${file}`;
      const stats = fs.statSync(originalFilePath);

      // write file
      if (stats.isFile()) {
        const contents = fs.readFileSync(originalFilePath, 'utf8');

        const writePath = `${baseServicePath}/${file}`;
        fs.writeFileSync(writePath, contents, 'utf8');
      }

      // create directory
      if (stats.isDirectory() && file !== 'node_modules') {
        const newDirectoryPath = `${baseServicePath}/${file}`;
        fs.mkdirSync(newDirectoryPath);

        // recursive call
        this.directoryContentCreator(`${this.baseTemplatePath}/${file}`, `${servicePath}/${file}`);
      }
    });

    this.log(`Template for "${servicePath}" was created!`, ANSI_COLOR_MAP.YELLOW);
  }

  /**
   * @param  {Object} serviceConfig
   */
  generatePackageJSON(serviceConfig) {
    const {
      serviceName, license, author,
    } = serviceConfig;
    const packageJSON = fs.readFileSync(`${this.baseTemplatePath}/package.json`);
    const parsedPackageJSON = JSON.parse(packageJSON);
    const newPackageJSON = {
      ...parsedPackageJSON,
      ...{
        name: serviceName,
        author,
        license,
      },
    };
    return JSON.stringify(newPackageJSON, null, 2);
  }

  /**
   * @param  {} msg - string
   * @param  {} color - string. Can be received from ANSI_COLOR_MAP enum
   */
  log(msg, color) {
    if (color) {
      // eslint-disable-next-line no-console
      console.log(color, msg, '\x1b[0m');
    } else {
      // eslint-disable-next-line no-console
      console.log(msg);
    }
  }
}

const serviceCreator = new ServiceCreator();
serviceCreator.createService();
