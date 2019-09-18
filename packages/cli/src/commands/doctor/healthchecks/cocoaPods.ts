import execa from 'execa';
import chalk from 'chalk';
import readline from 'readline';
import wcwidth from 'wcwidth';
import {logger} from '@react-native-community/cli-tools';
import {checkSoftwareInstalled} from '../checkInstallation';
import {
  promptCocoaPodsInstallationQuestion,
  runSudo,
} from '../../../tools/installPods';
import {brewInstall} from '../../../tools/brewInstall';
import {HealthCheckInterface} from '../types';

function calculateQuestionSize(promptQuestion: string) {
  return Math.max(
    1,
    Math.ceil(wcwidth(promptQuestion) / (process.stdout.columns || 80)),
  );
}

function clearQuestion(promptQuestion: string) {
  readline.moveCursor(
    process.stdout,
    0,
    -calculateQuestionSize(promptQuestion),
  );
  readline.clearScreenDown(process.stdout);
}

export default {
  label: 'CocoaPods',
  getDiagnostics: async () => ({
    needsToBeFixed: await checkSoftwareInstalled('pod'),
  }),
  runAutomaticFix: async ({loader}) => {
    loader.stop();

    const {
      installMethod,
      promptQuestion,
    } = await promptCocoaPodsInstallationQuestion();

    // Capitalise `Homebrew` when printing on the screen
    const installMethodCapitalized =
      installMethod === 'homebrew'
        ? installMethod.substr(0, 1).toUpperCase() + installMethod.substr(1)
        : installMethod;
    const loaderInstallationMessage = `CocoaPods (installing with ${installMethodCapitalized})`;
    const loaderSucceedMessage = `CocoaPods (installed with ${installMethodCapitalized})`;

    // Remove the prompt after the question of how to install CocoaPods is answered
    clearQuestion(promptQuestion);

    if (installMethod === 'gem') {
      loader.start(loaderInstallationMessage);

      const options = ['install', 'cocoapods', '--no-document'];

      try {
        // First attempt to install `cocoapods`
        await execa('gem', options);

        return loader.succeed(loaderSucceedMessage);
      } catch (_error) {
        // If that doesn't work then try with sudo
        try {
          await runSudo(`gem ${options.join(' ')}`);

          return loader.succeed(loaderSucceedMessage);
        } catch (error) {
          loader.fail();
          logger.log(chalk.dim(`\n${error}`));

          return logger.log(
            `An error occured while trying to install CocoaPods. Please try again manually: ${chalk.bold(
              'sudo gem install cocoapods',
            )}`,
          );
        }
      }
    }

    if (installMethod === 'homebrew') {
      return await brewInstall({
        pkg: 'cocoapods',
        label: loaderInstallationMessage,
        loader,
        onSuccess: () => loader.succeed(loaderSucceedMessage),
      });
    }
  },
} as HealthCheckInterface;
