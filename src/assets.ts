import { application } from '@ijstech/components';
import { ITokenObject } from './interface/index';

const moduleDir = application.currentModuleDir;

function fullPath(path: string): string {
  return `${moduleDir}/${path}`
};

const TokenFolderName: { [key: number]: string } = {
  1: "ethereum",
  25: "cronos",
  42: "kovan",
  56: "bsc",
  97: "bsc-testnet",
  137: "polygon",
  338: "cronos-testnet",
  31337: "amino",
  80001: "mumbai",
  43113: "fuji",
  43114: "avalanche",
  250: "fantom",
  4002: "fantom-testnet",
  13370: "aminox-testnet"
}

function tokenPath(tokenObj?: ITokenObject, chainId?: number): string {
  const pathPrefix = 'img/tokens';
  if (tokenObj && chainId && chainId >= 0) {
    let folderName = TokenFolderName[chainId];
    let fileName = (!tokenObj.isNative ? tokenObj?.address?.toLowerCase() : tokenObj.symbol) + '.png';
    return fullPath(`${pathPrefix}/${folderName}/${fileName}`);
  } else {
    return fullPath(`${pathPrefix}/Custom.png`);
  }
}

export default {
  logo: fullPath('img/logo.svg'),
  img: {
    network: {
      bsc: fullPath('img/networks/bsc.svg'),
      eth: fullPath('img/networks/eth.svg'),
      amio: fullPath('img/networks/amio.svg'),
      avax: fullPath('img/networks/avax.svg'),
      ftm: fullPath('img/networks/ftm.svg'),
      polygon: fullPath('img/networks/polygon.svg'),
    }
  },
  fullPath,
  tokenPath
};