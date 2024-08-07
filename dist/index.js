var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define("@scom/scom-nft-minter/interface/index.tsx", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ProductType = void 0;
    var ProductType;
    (function (ProductType) {
        ProductType["Buy"] = "Buy";
        ProductType["DonateToOwner"] = "DonateToOwner";
        ProductType["DonateToEveryone"] = "DonateToEveryone";
    })(ProductType = exports.ProductType || (exports.ProductType = {}));
});
define("@scom/scom-nft-minter/store/index.ts", ["require", "exports", "@ijstech/components", "@ijstech/eth-wallet"], function (require, exports, components_1, eth_wallet_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isClientWalletConnected = exports.getClientWallet = exports.State = void 0;
    class State {
        constructor(options) {
            this.contractInfoByChain = {};
            this.embedderCommissionFee = '0';
            this.rpcWalletId = '';
            this.initData(options);
        }
        initData(options) {
            if (options.contractInfo) {
                this.contractInfoByChain = options.contractInfo;
            }
            if (options.embedderCommissionFee) {
                this.embedderCommissionFee = options.embedderCommissionFee;
            }
        }
        initRpcWallet(defaultChainId) {
            if (this.rpcWalletId) {
                return this.rpcWalletId;
            }
            const clientWallet = eth_wallet_1.Wallet.getClientInstance();
            const networkList = Object.values(components_1.application.store?.networkMap || []);
            const instanceId = clientWallet.initRpcWallet({
                networks: networkList,
                defaultChainId,
                infuraId: components_1.application.store?.infuraId,
                multicalls: components_1.application.store?.multicalls
            });
            this.rpcWalletId = instanceId;
            if (clientWallet.address) {
                const rpcWallet = eth_wallet_1.Wallet.getRpcWalletInstance(instanceId);
                rpcWallet.address = clientWallet.address;
            }
            return instanceId;
        }
        getContractAddress(type) {
            const chainId = this.getChainId();
            const contracts = this.contractInfoByChain[chainId] || {};
            return contracts[type]?.address;
        }
        getRpcWallet() {
            return this.rpcWalletId ? eth_wallet_1.Wallet.getRpcWalletInstance(this.rpcWalletId) : null;
        }
        isRpcWalletConnected() {
            const wallet = this.getRpcWallet();
            return wallet?.isConnected;
        }
        getChainId() {
            const rpcWallet = this.getRpcWallet();
            return rpcWallet?.chainId;
        }
        async setApprovalModelAction(options) {
            const approvalOptions = {
                ...options,
                spenderAddress: ''
            };
            let wallet = this.getRpcWallet();
            this.approvalModel = new eth_wallet_1.ERC20ApprovalModel(wallet, approvalOptions);
            let approvalModelAction = this.approvalModel.getAction();
            return approvalModelAction;
        }
    }
    exports.State = State;
    function getClientWallet() {
        return eth_wallet_1.Wallet.getClientInstance();
    }
    exports.getClientWallet = getClientWallet;
    function isClientWalletConnected() {
        const wallet = eth_wallet_1.Wallet.getClientInstance();
        return wallet.isConnected;
    }
    exports.isClientWalletConnected = isClientWalletConnected;
});
define("@scom/scom-nft-minter/utils/token.ts", ["require", "exports", "@ijstech/eth-wallet"], function (require, exports, eth_wallet_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.registerSendTxEvents = exports.getTokenBalance = exports.getERC20Amount = void 0;
    const getERC20Amount = async (wallet, tokenAddress, decimals) => {
        try {
            let erc20 = new eth_wallet_2.Erc20(wallet, tokenAddress, decimals);
            return await erc20.balance;
        }
        catch {
            return new eth_wallet_2.BigNumber(0);
        }
    };
    exports.getERC20Amount = getERC20Amount;
    const getTokenBalance = async (wallet, token) => {
        let balance = new eth_wallet_2.BigNumber(0);
        if (!token)
            return balance;
        if (token.address) {
            balance = await (0, exports.getERC20Amount)(wallet, token.address, token.decimals);
        }
        else {
            balance = await wallet.balance;
        }
        return balance;
    };
    exports.getTokenBalance = getTokenBalance;
    const registerSendTxEvents = (sendTxEventHandlers) => {
        const wallet = eth_wallet_2.Wallet.getClientInstance();
        wallet.registerSendTxEvents({
            transactionHash: (error, receipt) => {
                if (sendTxEventHandlers.transactionHash) {
                    sendTxEventHandlers.transactionHash(error, receipt);
                }
            },
            confirmation: (receipt) => {
                if (sendTxEventHandlers.confirmation) {
                    sendTxEventHandlers.confirmation(receipt);
                }
            },
        });
    };
    exports.registerSendTxEvents = registerSendTxEvents;
});
define("@scom/scom-nft-minter/utils/index.ts", ["require", "exports", "@scom/scom-product-contract", "@ijstech/components", "@scom/scom-nft-minter/utils/token.ts"], function (require, exports, scom_product_contract_1, components_2, token_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.registerSendTxEvents = exports.getTokenBalance = exports.getERC20Amount = exports.getProxySelectors = exports.formatNumber = void 0;
    const formatNumber = (value, decimalFigures) => {
        if (typeof value === 'object') {
            value = value.toFixed();
        }
        const minValue = '0.0000001';
        return components_2.FormatUtils.formatNumber(value, { decimalFigures: decimalFigures || 4, minValue });
    };
    exports.formatNumber = formatNumber;
    async function getProxySelectors(state, chainId) {
        const wallet = state.getRpcWallet();
        await wallet.init();
        if (wallet.chainId != chainId)
            await wallet.switchNetwork(chainId);
        let productInfoAddress = state.getContractAddress('ProductInfo');
        let contract = new scom_product_contract_1.Contracts.ProductInfo(wallet, productInfoAddress);
        let permittedProxyFunctions = [
            "buy",
            "buyEth",
            "donate",
            "donateEth"
        ];
        let selectors = permittedProxyFunctions
            .map(e => e + "(" + contract._abi.filter(f => f.name == e)[0].inputs.map(f => f.type).join(',') + ")")
            .map(e => wallet.soliditySha3(e).substring(0, 10))
            .map(e => contract.address.toLowerCase() + e.replace("0x", ""));
        return selectors;
    }
    exports.getProxySelectors = getProxySelectors;
    Object.defineProperty(exports, "getERC20Amount", { enumerable: true, get: function () { return token_1.getERC20Amount; } });
    Object.defineProperty(exports, "getTokenBalance", { enumerable: true, get: function () { return token_1.getTokenBalance; } });
    Object.defineProperty(exports, "registerSendTxEvents", { enumerable: true, get: function () { return token_1.registerSendTxEvents; } });
});
define("@scom/scom-nft-minter/index.css.ts", ["require", "exports", "@ijstech/components"], function (require, exports, components_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.tokenSelectionStyle = exports.inputStyle = exports.markdownStyle = void 0;
    const Theme = components_3.Styles.Theme.ThemeVars;
    exports.markdownStyle = components_3.Styles.style({
        color: Theme.text.primary,
        overflowWrap: 'break-word'
    });
    exports.inputStyle = components_3.Styles.style({
        $nest: {
            '> input': {
                textAlign: 'right'
            }
        }
    });
    exports.tokenSelectionStyle = components_3.Styles.style({
        $nest: {
            // '.i-modal_header': {
            //   display: 'none'
            // },
            '#gridTokenList': {
                // maxHeight: '50vh',
                // overflow: 'auto',
                $nest: {
                    '&::-webkit-scrollbar-track': {
                        background: 'transparent',
                    },
                    '&::-webkit-scrollbar': {
                        width: '5px',
                        height: '5px'
                    },
                    '&::-webkit-scrollbar-thumb': {
                        background: '#FF8800',
                        borderRadius: '5px'
                    }
                }
            },
            // '#pnlSortBalance': {
            //   $nest: {
            //     '.icon-sort-up': {
            //       top: 1
            //     },
            //     '.icon-sort-down': {
            //       bottom: 1
            //     },
            //     'i-icon svg': {
            //       fill: 'inherit'
            //     }
            //   }
            // }
        }
    });
});
define("@scom/scom-nft-minter/API.ts", ["require", "exports", "@ijstech/eth-wallet", "@scom/scom-nft-minter/interface/index.tsx", "@scom/scom-product-contract", "@scom/scom-commission-proxy-contract", "@scom/scom-nft-minter/utils/index.ts", "@scom/scom-token-list"], function (require, exports, eth_wallet_3, index_1, scom_product_contract_2, scom_commission_proxy_contract_1, index_2, scom_token_list_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.donate = exports.buyProduct = exports.getProxyTokenAmountIn = exports.newProduct = exports.getProductInfo = void 0;
    async function getProductInfo(state, productId) {
        let productInfoAddress = state.getContractAddress('ProductInfo');
        if (!productInfoAddress)
            return null;
        try {
            const wallet = state.getRpcWallet();
            const productInfo = new scom_product_contract_2.Contracts.ProductInfo(wallet, productInfoAddress);
            const product = await productInfo.products(productId);
            const chainId = wallet.chainId;
            const _tokenList = scom_token_list_1.tokenStore.getTokenList(chainId);
            const token = _tokenList.find(token => product?.token && token?.address && token.address.toLowerCase() === product.token.toLowerCase());
            return {
                ...product,
                token
            };
        }
        catch {
            return null;
        }
    }
    exports.getProductInfo = getProductInfo;
    async function newProduct(state, productType, qty, maxQty, price, maxPrice, token, callback, confirmationCallback) {
        let productInfoAddress = state.getContractAddress('ProductInfo');
        const wallet = eth_wallet_3.Wallet.getClientInstance();
        const productInfo = new scom_product_contract_2.Contracts.ProductInfo(wallet, productInfoAddress);
        (0, index_2.registerSendTxEvents)({
            transactionHash: callback,
            confirmation: confirmationCallback
        });
        const tokenDecimals = token?.decimals || 18;
        let productTypeCode;
        switch (productType) {
            case index_1.ProductType.Buy:
                productTypeCode = 0;
                break;
            case index_1.ProductType.DonateToOwner:
                productTypeCode = 1;
                break;
            case index_1.ProductType.DonateToEveryone:
                productTypeCode = 2;
                break;
        }
        let receipt = await productInfo.newProduct({
            productType: productTypeCode,
            uri: '',
            quantity: qty,
            maxQuantity: maxQty,
            maxPrice: eth_wallet_3.Utils.toDecimals(maxPrice, tokenDecimals),
            price: eth_wallet_3.Utils.toDecimals(price, tokenDecimals),
            token: token?.address || ""
        });
        let productId;
        if (receipt) {
            let event = productInfo.parseNewProductEvent(receipt)[0];
            productId = event?.productId.toNumber();
        }
        return {
            receipt,
            productId
        };
    }
    exports.newProduct = newProduct;
    function getProxyTokenAmountIn(productPrice, quantity, commissions) {
        const amount = new eth_wallet_3.BigNumber(productPrice).isZero() ? new eth_wallet_3.BigNumber(quantity) : new eth_wallet_3.BigNumber(productPrice).times(quantity);
        if (!commissions || !commissions.length) {
            return amount.toFixed();
        }
        const _commissions = commissions.map(v => {
            return {
                to: v.walletAddress,
                amount: amount.times(v.share)
            };
        });
        const commissionsAmount = _commissions.map(v => v.amount).reduce((a, b) => a.plus(b));
        return amount.plus(commissionsAmount).toFixed();
    }
    exports.getProxyTokenAmountIn = getProxyTokenAmountIn;
    async function buyProduct(state, productId, quantity, commissions, token, callback, confirmationCallback) {
        let proxyAddress = state.getContractAddress('Proxy');
        let productInfoAddress = state.getContractAddress('ProductInfo');
        const wallet = eth_wallet_3.Wallet.getClientInstance();
        const proxy = new scom_commission_proxy_contract_1.Contracts.Proxy(wallet, proxyAddress);
        const productInfo = new scom_product_contract_2.Contracts.ProductInfo(wallet, productInfoAddress);
        const product = await productInfo.products(productId);
        const amount = product.price.times(quantity);
        const _commissions = (commissions || []).filter(v => v.chainId === state.getChainId()).map(v => {
            return {
                to: v.walletAddress,
                amount: amount.times(v.share)
            };
        });
        const commissionsAmount = _commissions.length ? _commissions.map(v => v.amount).reduce((a, b) => a.plus(b)) : new eth_wallet_3.BigNumber(0);
        let receipt;
        try {
            if (token?.address) {
                (0, index_2.registerSendTxEvents)({
                    transactionHash: callback,
                    confirmation: confirmationCallback
                });
                if (commissionsAmount.isZero()) {
                    receipt = await productInfo.buy({
                        productId: productId,
                        quantity: quantity,
                        amountIn: amount,
                        to: wallet.address
                    });
                }
                else {
                    const txData = await productInfo.buy.txData({
                        productId: productId,
                        quantity: quantity,
                        amountIn: amount,
                        to: wallet.address
                    });
                    const tokensIn = {
                        token: token.address,
                        amount: amount.plus(commissionsAmount),
                        directTransfer: false,
                        commissions: _commissions
                    };
                    receipt = await proxy.tokenIn({
                        target: productInfoAddress,
                        tokensIn,
                        data: txData
                    });
                }
            }
            else {
                (0, index_2.registerSendTxEvents)({
                    transactionHash: callback,
                    confirmation: confirmationCallback
                });
                if (commissionsAmount.isZero()) {
                    receipt = await productInfo.buyEth({
                        productId: productId,
                        quantity,
                        to: wallet.address
                    });
                }
                else {
                    const txData = await productInfo.buyEth.txData({
                        productId: productId,
                        quantity,
                        to: wallet.address
                    }, amount);
                    receipt = await proxy.ethIn({
                        target: productInfoAddress,
                        commissions: _commissions,
                        data: txData
                    }, amount.plus(commissionsAmount));
                }
            }
        }
        catch (err) {
            console.error(err);
        }
        return receipt;
    }
    exports.buyProduct = buyProduct;
    async function donate(state, productId, donateTo, amountIn, commissions, token, callback, confirmationCallback) {
        let proxyAddress = state.getContractAddress('Proxy');
        let productInfoAddress = state.getContractAddress('ProductInfo');
        const wallet = eth_wallet_3.Wallet.getClientInstance();
        const proxy = new scom_commission_proxy_contract_1.Contracts.Proxy(wallet, proxyAddress);
        const productInfo = new scom_product_contract_2.Contracts.ProductInfo(wallet, productInfoAddress);
        const tokenDecimals = token?.decimals || 18;
        const amount = eth_wallet_3.Utils.toDecimals(amountIn, tokenDecimals);
        const _commissions = (commissions || []).map(v => {
            return {
                to: v.walletAddress,
                amount: amount.times(v.share)
            };
        });
        const commissionsAmount = _commissions.length ? _commissions.map(v => v.amount).reduce((a, b) => a.plus(b)) : new eth_wallet_3.BigNumber(0);
        let receipt;
        try {
            if (token?.address) {
                (0, index_2.registerSendTxEvents)({
                    transactionHash: callback,
                    confirmation: confirmationCallback
                });
                if (commissionsAmount.isZero()) {
                    receipt = await productInfo.donate({
                        donor: wallet.address,
                        donee: donateTo,
                        productId: productId,
                        amountIn: amount
                    });
                }
                else {
                    const txData = await productInfo.donate.txData({
                        donor: wallet.address,
                        donee: donateTo,
                        productId: productId,
                        amountIn: amount
                    });
                    const tokensIn = {
                        token: token.address,
                        amount: amount.plus(commissionsAmount),
                        directTransfer: false,
                        commissions: _commissions
                    };
                    receipt = await proxy.tokenIn({
                        target: productInfoAddress,
                        tokensIn,
                        data: txData
                    });
                }
            }
            else {
                (0, index_2.registerSendTxEvents)({
                    transactionHash: callback,
                    confirmation: confirmationCallback
                });
                if (commissionsAmount.isZero()) {
                    receipt = await productInfo.donateEth({
                        donor: wallet.address,
                        donee: donateTo,
                        productId: productId
                    });
                }
                else {
                    const txData = await productInfo.donateEth.txData({
                        donor: wallet.address,
                        donee: donateTo,
                        productId: productId
                    }, amount);
                    receipt = await proxy.ethIn({
                        target: productInfoAddress,
                        commissions: _commissions,
                        data: txData
                    }, amount.plus(commissionsAmount));
                }
            }
        }
        catch (err) {
            console.error(err);
        }
        return receipt;
    }
    exports.donate = donate;
});
define("@scom/scom-nft-minter/data.json.ts", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    ///<amd-module name='@scom/scom-nft-minter/data.json.ts'/> 
    exports.default = {
        "contractInfo": {
            "43113": {
                "ProductNFT": {
                    "address": "0xB50fb7AFfef05021a215Af71548305a8D1ABf582"
                },
                "ProductInfo": {
                    "address": "0x23066A700753c57dCb609CE45e06ac5a7BfDb64d"
                },
                "Proxy": {
                    "address": "0x7f1EAB0db83c02263539E3bFf99b638E61916B96"
                }
            },
            "97": {
                "ProductNFT": {
                    "address": "0xd638ce7b39e38C410E672eb409cb4813FD844771"
                },
                "ProductInfo": {
                    "address": "0xa5CDA5D7F379145b97B47aD1c2d78f827C053D91"
                },
                "Proxy": {
                    "address": "0x9602cB9A782babc72b1b6C96E050273F631a6870"
                }
            }
        },
        "embedderCommissionFee": "0.01",
        "defaultBuilderData": {
            // "name": "Donation Dapp",
            // "title": "Title",
            // "productType": "DonateToEveryone",
            // "description": "#### Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
            // "link": "",
            // "hideDescription": true,
            // "logoUrl": "https://placehold.co/600x400?text=No+Image",
            // "chainSpecificProperties": {
            //     "97": {
            //         "productId": 1,
            //         "donateTo": "0xCE001a607402Bba038F404106CA6682fBb1108F6"
            //     },
            //     "43113": {
            //         "productId": 1,
            //         "donateTo": "0xCE001a607402Bba038F404106CA6682fBb1108F6"
            //     }
            // },
            "defaultChainId": 43113,
            "networks": [
                {
                    "chainId": 43113
                },
                {
                    "chainId": 97
                }
            ],
            "wallets": [
                {
                    "name": "metamask"
                }
            ]
        }
    };
});
define("@scom/scom-nft-minter/formSchema.json.ts", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getProjectOwnerSchema = exports.getBuilderSchema = void 0;
    ///<amd-module name='@scom/scom-nft-minter/formSchema.json.ts'/> 
    const theme = {
        backgroundColor: {
            type: 'string',
            format: 'color'
        },
        fontColor: {
            type: 'string',
            format: 'color'
        },
        inputBackgroundColor: {
            type: 'string',
            format: 'color'
        },
        inputFontColor: {
            type: 'string',
            format: 'color'
        }
    };
    function getBuilderSchema() {
        return {
            dataSchema: {
                type: 'object',
                properties: {
                    title: {
                        type: 'string'
                    },
                    description: {
                        type: 'string',
                        format: 'multi'
                    },
                    logoUrl: {
                        type: 'string',
                        title: 'Logo URL'
                    },
                    link: {
                        type: 'string'
                    },
                    dark: {
                        type: 'object',
                        properties: theme
                    },
                    light: {
                        type: 'object',
                        properties: theme
                    }
                }
            },
            uiSchema: {
                type: 'Categorization',
                elements: [
                    {
                        type: 'Category',
                        label: 'General',
                        elements: [
                            {
                                type: 'VerticalLayout',
                                elements: [
                                    {
                                        type: 'Control',
                                        scope: '#/properties/title'
                                    },
                                    {
                                        type: 'Control',
                                        scope: '#/properties/description'
                                    },
                                    {
                                        type: 'Control',
                                        scope: '#/properties/logoUrl'
                                    },
                                    {
                                        type: 'Control',
                                        scope: '#/properties/link'
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        type: 'Category',
                        label: 'Theme',
                        elements: [
                            {
                                type: 'VerticalLayout',
                                elements: [
                                    {
                                        type: 'Control',
                                        label: 'Dark',
                                        scope: '#/properties/dark'
                                    },
                                    {
                                        type: 'Control',
                                        label: 'Light',
                                        scope: '#/properties/light'
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        };
    }
    exports.getBuilderSchema = getBuilderSchema;
    function getProjectOwnerSchema(isDonation) {
        const dataSchema = {
            type: 'object',
            properties: {
                title: {
                    type: 'string'
                },
                description: {
                    type: 'string',
                    format: 'multi'
                },
                logoUrl: {
                    type: 'string',
                    title: 'Logo URL'
                },
                productId: {
                    type: 'integer',
                    minimum: 1,
                    required: true
                },
                link: {
                    type: 'string'
                },
                dark: {
                    type: 'object',
                    properties: theme
                },
                light: {
                    type: 'object',
                    properties: theme
                }
            }
        };
        const donateElements = [];
        if (isDonation) {
            dataSchema.properties["donateTo"] = {
                type: 'string',
                format: 'wallet-address'
            };
            donateElements.push({
                type: 'Control',
                scope: '#/properties/donateTo',
            });
        }
        return {
            dataSchema: dataSchema,
            uiSchema: {
                type: 'Categorization',
                elements: [
                    {
                        type: 'Category',
                        label: 'General',
                        elements: [
                            {
                                type: 'VerticalLayout',
                                elements: [
                                    {
                                        type: 'Control',
                                        scope: '#/properties/title'
                                    },
                                    {
                                        type: 'Control',
                                        scope: '#/properties/productType'
                                    },
                                    {
                                        type: 'Control',
                                        scope: '#/properties/productId'
                                    },
                                    ...donateElements,
                                    {
                                        type: 'Control',
                                        scope: '#/properties/description'
                                    },
                                    {
                                        type: 'Control',
                                        scope: '#/properties/logoUrl'
                                    },
                                    {
                                        type: 'Control',
                                        scope: '#/properties/link'
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        type: 'Category',
                        label: 'Theme',
                        elements: [
                            {
                                type: 'VerticalLayout',
                                elements: [
                                    {
                                        type: 'Control',
                                        label: 'Dark',
                                        scope: '#/properties/dark'
                                    },
                                    {
                                        type: 'Control',
                                        label: 'Light',
                                        scope: '#/properties/light'
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        };
    }
    exports.getProjectOwnerSchema = getProjectOwnerSchema;
});
define("@scom/scom-nft-minter", ["require", "exports", "@ijstech/components", "@ijstech/eth-wallet", "@scom/scom-nft-minter/interface/index.tsx", "@scom/scom-nft-minter/utils/index.ts", "@scom/scom-nft-minter/store/index.ts", "@scom/scom-nft-minter/index.css.ts", "@scom/scom-nft-minter/API.ts", "@scom/scom-nft-minter/data.json.ts", "@scom/scom-commission-fee-setup", "@scom/scom-nft-minter/formSchema.json.ts"], function (require, exports, components_4, eth_wallet_4, index_3, index_4, index_5, index_css_1, API_1, data_json_1, scom_commission_fee_setup_1, formSchema_json_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const Theme = components_4.Styles.Theme.ThemeVars;
    let ScomNftMinter = class ScomNftMinter extends components_4.Module {
        constructor(parent, options) {
            super(parent, options);
            this._data = {
                wallets: [],
                networks: [],
                defaultChainId: 0
            };
            this.isApproving = false;
            this.tag = {};
            this.defaultEdit = true;
            this.rpcWalletEvents = [];
            this.onChainChanged = async () => {
                this.tokenInput.chainId = this.state.getChainId();
                this.onSetupPage();
                this.updateContractAddress();
                this.refreshDApp();
            };
            this.updateTokenBalance = async () => {
                const token = this.productInfo?.token;
                if (!token)
                    return;
                try {
                    const symbol = token?.symbol || '';
                    this.lblBalance.caption = token ? `${(0, index_4.formatNumber)(await (0, index_4.getTokenBalance)(this.rpcWallet, token))} ${symbol}` : `0 ${symbol}`;
                }
                catch { }
            };
            this.state = new index_5.State(data_json_1.default);
        }
        removeRpcWalletEvents() {
            const rpcWallet = this.rpcWallet;
            for (let event of this.rpcWalletEvents) {
                rpcWallet.unregisterWalletEvent(event);
            }
            this.rpcWalletEvents = [];
        }
        onHide() {
            this.containerDapp.onHide();
            this.removeRpcWalletEvents();
        }
        static async create(options, parent) {
            let self = new this(parent, options);
            await self.ready();
            return self;
        }
        get chainId() {
            return this.state.getChainId();
        }
        get rpcWallet() {
            return this.state.getRpcWallet();
        }
        get donateTo() {
            return this._data.donateTo ?? this._data.chainSpecificProperties?.[this.chainId]?.donateTo ?? '';
        }
        get link() {
            return this._data.link ?? '';
        }
        set link(value) {
            this._data.link = value;
        }
        get productId() {
            return this._data.productId ?? this._data.chainSpecificProperties?.[this.chainId]?.productId ?? 0;
        }
        get productType() {
            return this._data.productType ?? index_3.ProductType.Buy;
        }
        set productType(value) {
            this._data.productType = value;
        }
        get name() {
            return this._data.name ?? '';
        }
        set name(value) {
            this._data.name = value;
        }
        get description() {
            return this._data.description ?? '';
        }
        set description(value) {
            this._data.description = value;
        }
        get logoUrl() {
            return this._data.logoUrl;
        }
        set logoUrl(value) {
            this._data.logoUrl = value;
        }
        get commissions() {
            return this._data.commissions ?? [];
        }
        set commissions(value) {
            this._data.commissions = value;
        }
        get chainSpecificProperties() {
            return this._data.chainSpecificProperties ?? {};
        }
        set chainSpecificProperties(value) {
            this._data.chainSpecificProperties = value;
        }
        get wallets() {
            return this._data.wallets ?? [];
        }
        set wallets(value) {
            this._data.wallets = value;
        }
        get networks() {
            return this._data.networks ?? [];
        }
        set networks(value) {
            this._data.networks = value;
        }
        get showHeader() {
            return this._data.showHeader ?? true;
        }
        set showHeader(value) {
            this._data.showHeader = value;
        }
        get defaultChainId() {
            return this._data.defaultChainId;
        }
        set defaultChainId(value) {
            this._data.defaultChainId = value;
        }
        async onSetupPage() {
            if (this.state.isRpcWalletConnected())
                await this.initApprovalAction();
        }
        getBuilderActions(category) {
            let self = this;
            const formSchema = (0, formSchema_json_1.getBuilderSchema)();
            const actions = [
                {
                    name: 'Commissions',
                    icon: 'dollar-sign',
                    command: (builder, userInputData) => {
                        let _oldData = {
                            wallets: [],
                            networks: [],
                            defaultChainId: 0
                        };
                        return {
                            execute: async () => {
                                _oldData = { ...this._data };
                                let resultingData = {
                                    ...self._data,
                                    commissions: userInputData.commissions
                                };
                                await self.setData(resultingData);
                                if (builder?.setData)
                                    builder.setData(this._data);
                            },
                            undo: async () => {
                                this._data = { ..._oldData };
                                await self.setData(this._data);
                                if (builder?.setData)
                                    builder.setData(this._data);
                            },
                            redo: () => { }
                        };
                    },
                    customUI: {
                        render: (data, onConfirm) => {
                            const vstack = new components_4.VStack();
                            const config = new scom_commission_fee_setup_1.default(null, {
                                commissions: self._data.commissions,
                                fee: this.state.embedderCommissionFee,
                                networks: self._data.networks
                            });
                            const hstack = new components_4.HStack(null, {
                                verticalAlignment: 'center',
                            });
                            const button = new components_4.Button(hstack, {
                                caption: 'Confirm',
                                width: '100%',
                                height: 40,
                                font: { color: Theme.colors.primary.contrastText }
                            });
                            vstack.append(config);
                            vstack.append(hstack);
                            button.onClick = async () => {
                                const commissions = config.commissions;
                                if (onConfirm)
                                    onConfirm(true, { commissions });
                            };
                            return vstack;
                        }
                    }
                }
            ];
            if (category && category !== 'offers') {
                actions.push({
                    name: 'Edit',
                    icon: 'edit',
                    command: (builder, userInputData) => {
                        let oldData = {
                            wallets: [],
                            networks: [],
                            defaultChainId: 0
                        };
                        let oldTag = {};
                        return {
                            execute: async () => {
                                oldData = JSON.parse(JSON.stringify(this._data));
                                const { name, title, productType, logoUrl, description, link, ...themeSettings } = userInputData;
                                const generalSettings = {
                                    name,
                                    title,
                                    productType,
                                    logoUrl,
                                    description,
                                    link
                                };
                                Object.assign(this._data, generalSettings);
                                await this.resetRpcWallet();
                                if (builder?.setData)
                                    builder.setData(this._data);
                                this.refreshDApp();
                                oldTag = JSON.parse(JSON.stringify(this.tag));
                                if (builder?.setTag)
                                    builder.setTag(themeSettings);
                                else
                                    this.setTag(themeSettings);
                                if (this.containerDapp)
                                    this.containerDapp.setTag(themeSettings);
                            },
                            undo: () => {
                                this._data = JSON.parse(JSON.stringify(oldData));
                                this.refreshDApp();
                                if (builder?.setData)
                                    builder.setData(this._data);
                                this.tag = JSON.parse(JSON.stringify(oldTag));
                                if (builder?.setTag)
                                    builder.setTag(this.tag);
                                else
                                    this.setTag(this.tag);
                                if (this.containerDapp)
                                    this.containerDapp.setTag(this.tag);
                            },
                            redo: () => { }
                        };
                    },
                    userInputDataSchema: formSchema.dataSchema,
                    userInputUISchema: formSchema.uiSchema
                });
            }
            return actions;
        }
        getProjectOwnerActions() {
            const isDonation = this._data.productType === index_3.ProductType.DonateToOwner || this._data.productType === index_3.ProductType.DonateToEveryone;
            const formSchema = (0, formSchema_json_1.getProjectOwnerSchema)(isDonation);
            const actions = [
                {
                    name: 'Settings',
                    userInputDataSchema: formSchema.dataSchema,
                    userInputUISchema: formSchema.uiSchema
                }
            ];
            return actions;
        }
        getConfigurators() {
            let self = this;
            return [
                {
                    name: 'Project Owner Configurator',
                    target: 'Project Owners',
                    getProxySelectors: async (chainId) => {
                        const selectors = await (0, index_4.getProxySelectors)(this.state, chainId);
                        return selectors;
                    },
                    getActions: () => {
                        return this.getProjectOwnerActions();
                    },
                    getData: this.getData.bind(this),
                    setData: async (data) => {
                        await this.setData(data);
                    },
                    getTag: this.getTag.bind(this),
                    setTag: this.setTag.bind(this)
                },
                {
                    name: 'Builder Configurator',
                    target: 'Builders',
                    getActions: (category) => {
                        return this.getBuilderActions(category);
                    },
                    getData: this.getData.bind(this),
                    setData: async (data) => {
                        const defaultData = data_json_1.default.defaultBuilderData;
                        await this.setData({ ...defaultData, ...data });
                    },
                    getTag: this.getTag.bind(this),
                    setTag: this.setTag.bind(this)
                },
                {
                    name: 'Emdedder Configurator',
                    target: 'Embedders',
                    elementName: 'i-scom-commission-fee-setup',
                    getLinkParams: () => {
                        const commissions = self._data.commissions || [];
                        return {
                            data: window.btoa(JSON.stringify(commissions))
                        };
                    },
                    setLinkParams: async (params) => {
                        if (params.data) {
                            const decodedString = window.atob(params.data);
                            const commissions = JSON.parse(decodedString);
                            let resultingData = {
                                ...self._data,
                                commissions
                            };
                            await self.setData(resultingData);
                        }
                    },
                    bindOnChanged: (element, callback) => {
                        element.onChanged = async (data) => {
                            let resultingData = {
                                ...self._data,
                                ...data
                            };
                            await self.setData(resultingData);
                            await callback(data);
                        };
                    },
                    getData: () => {
                        const fee = this.state.embedderCommissionFee;
                        return { ...this.getData(), fee };
                    },
                    setData: this.setData.bind(this),
                    getTag: this.getTag.bind(this),
                    setTag: this.setTag.bind(this)
                },
                {
                    name: 'Editor',
                    target: 'Editor',
                    getActions: (category) => {
                        const actions = this.getProjectOwnerActions();
                        return actions;
                    },
                    getData: this.getData.bind(this),
                    setData: this.setData.bind(this),
                    getTag: this.getTag.bind(this),
                    setTag: this.setTag.bind(this)
                }
            ];
        }
        getData() {
            return this._data;
        }
        async resetRpcWallet() {
            this.removeRpcWalletEvents();
            const rpcWalletId = await this.state.initRpcWallet(this.defaultChainId);
            const rpcWallet = this.rpcWallet;
            const chainChangedEvent = rpcWallet.registerWalletEvent(this, eth_wallet_4.Constants.RpcWalletEvent.ChainChanged, async (chainId) => {
                this.onChainChanged();
            });
            const connectedEvent = rpcWallet.registerWalletEvent(this, eth_wallet_4.Constants.RpcWalletEvent.Connected, async (connected) => {
                this.onSetupPage();
                this.updateContractAddress();
                this.refreshDApp();
            });
            this.rpcWalletEvents.push(chainChangedEvent, connectedEvent);
            const data = {
                defaultChainId: this.defaultChainId,
                wallets: this.wallets,
                networks: this.networks,
                showHeader: this.showHeader,
                rpcWalletId: rpcWallet.instanceId
            };
            if (this.containerDapp?.setData)
                this.containerDapp.setData(data);
        }
        async setData(data) {
            this._data = data;
            await this.resetRpcWallet();
            if (!this.tokenInput.isConnected)
                await this.tokenInput.ready();
            // if (this.tokenInput.rpcWalletId !== this.rpcWallet.instanceId) {
            //   this.tokenInput.rpcWalletId = this.rpcWallet.instanceId;
            // }
            this.tokenInput.chainId = this.state.getChainId() ?? this.defaultChainId;
            await this.onSetupPage();
            const commissionFee = this.state.embedderCommissionFee;
            if (!this.lbOrderTotalTitle.isConnected)
                await this.lbOrderTotalTitle.ready();
            this.lbOrderTotalTitle.caption = `Total`;
            this.iconOrderTotal.tooltip.content = `A commission fee of ${new eth_wallet_4.BigNumber(commissionFee).times(100)}% will be applied to the amount you input.`;
            this.updateContractAddress();
            await this.refreshDApp();
        }
        getTag() {
            return this.tag;
        }
        updateTag(type, value) {
            this.tag[type] = this.tag[type] ?? {};
            for (let prop in value) {
                if (value.hasOwnProperty(prop))
                    this.tag[type][prop] = value[prop];
            }
        }
        async setTag(value) {
            const newValue = value || {};
            for (let prop in newValue) {
                if (newValue.hasOwnProperty(prop)) {
                    if (prop === 'light' || prop === 'dark')
                        this.updateTag(prop, newValue[prop]);
                    else
                        this.tag[prop] = newValue[prop];
                }
            }
            if (this.containerDapp)
                this.containerDapp.setTag(this.tag);
            this.updateTheme();
        }
        updateStyle(name, value) {
            value ?
                this.style.setProperty(name, value) :
                this.style.removeProperty(name);
        }
        updateTheme() {
            const themeVar = this.containerDapp?.theme || 'dark';
            this.updateStyle('--text-primary', this.tag[themeVar]?.fontColor);
            this.updateStyle('--background-main', this.tag[themeVar]?.backgroundColor);
            this.updateStyle('--input-font_color', this.tag[themeVar]?.inputFontColor);
            this.updateStyle('--input-background', this.tag[themeVar]?.inputBackgroundColor);
            this.updateStyle('--colors-primary-main', this.tag[themeVar]?.buttonBackgroundColor);
        }
        // private newProduct = async (callback?: any, confirmationCallback?: any) => {
        //   if (
        //     this._data.productId >= 0
        //   ) return;
        //   const result = await newProduct(
        //     this._data.productType,
        //     this._data.qty,
        //     this._data.maxOrderQty,
        //     this._data.price,
        //     this._data.maxPrice,
        //     this._data.token,
        //     callback,
        //     confirmationCallback
        //   );
        //   this._productId = this._data.productId = result.productId;
        // }
        async initWallet() {
            try {
                await eth_wallet_4.Wallet.getClientInstance().init();
                await this.rpcWallet.init();
            }
            catch { }
        }
        async updateDAppUI(data) {
            this.markdownViewer.load(data.description || '');
            this.pnlLink.visible = !!data.link;
            (!this.lblLink.isConnected) && await this.lblLink.ready();
            this.lblLink.caption = data.link || '';
            this.lblLink.link.href = data.link;
            this.imgLogo.url = data.logoUrl || "";
            (!this.lblTitle.isConnected) && await this.lblTitle.ready();
            this.lblTitle.caption = data.title || '';
        }
        async refreshDApp() {
            setTimeout(async () => {
                this._type = this._data.productType;
                let tmpData = JSON.parse(JSON.stringify(this._data));
                if (!this._data.title && !this._data.description && !this._data.logoUrl && !this._data.link) {
                    Object.assign(tmpData, {
                        title: "Title",
                        description: "#### Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
                        logoUrl: "https://placehold.co/600x400?text=No+Image"
                    });
                }
                await this.updateDAppUI(tmpData);
                if (!this.productId || this.productId === 0)
                    return;
                await this.initWallet();
                this.productInfo = await (0, API_1.getProductInfo)(this.state, this.productId);
                if (this.productInfo) {
                    const token = this.productInfo.token;
                    this.pnlInputFields.visible = true;
                    this.pnlUnsupportedNetwork.visible = false;
                    const price = eth_wallet_4.Utils.fromDecimals(this.productInfo.price, token.decimals).toFixed();
                    (!this.lblRef.isConnected) && await this.lblRef.ready();
                    if (this._type === index_3.ProductType.Buy) {
                        this.lblYouPay.caption = `You pay`;
                        this.pnlMintFee.visible = true;
                        this.lblMintFee.caption = `${price ? (0, index_4.formatNumber)(price) : ""} ${token?.symbol || ""}`;
                        this.lblTitle.caption = this._data.title;
                        this.lblRef.caption = 'smart contract:';
                        this.updateSpotsRemaining();
                        // this.gridTokenInput.visible = false;
                        this.tokenInput.inputReadOnly = true;
                        this.pnlQty.visible = true;
                        this.pnlSpotsRemaining.visible = true;
                        this.pnlMaxQty.visible = true;
                        this.lblMaxQty.caption = (0, index_4.formatNumber)(this.productInfo.maxQuantity);
                    }
                    else {
                        this.lblYouPay.caption = `Your donation`;
                        this.pnlMintFee.visible = false;
                        this.lblTitle.caption = this._data.title || 'Make a Contributon';
                        this.lblRef.caption = 'All proceeds will go to following vetted wallet address:';
                        // this.gridTokenInput.visible = true;
                        this.tokenInput.inputReadOnly = false;
                        this.pnlQty.visible = false;
                        this.pnlSpotsRemaining.visible = false;
                        this.pnlMaxQty.visible = false;
                    }
                    this.edtQty.value = "";
                    this.tokenInput.value = "";
                    this.lbOrderTotal.caption = "0";
                    (!this.lblAddress.isConnected) && await this.lblAddress.ready();
                    this.lblAddress.caption = this.contractAddress;
                    // this.tokenInput.tokenReadOnly = this._data.token ? true : new BigNumber(price).gt(0);
                    this.tokenInput.token = token;
                    this.updateTokenBalance();
                    // this.lblBalance.caption = formatNumber(await getTokenBalance(this.rpcWallet, this._data.token));
                }
                else {
                    this.pnlInputFields.visible = false;
                    this.pnlUnsupportedNetwork.visible = true;
                }
                this.determineBtnSubmitCaption();
            });
        }
        updateSpotsRemaining() {
            if (this.productId >= 0) {
                this.lblSpotsRemaining.caption = `${(0, index_4.formatNumber)(this.productInfo.quantity)}`;
            }
            else {
                this.lblSpotsRemaining.caption = '';
            }
        }
        showTxStatusModal(status, content) {
            if (!this.txStatusModal)
                return;
            let params = { status };
            if (status === 'success') {
                params.txtHash = content;
            }
            else {
                params.content = content;
            }
            this.txStatusModal.message = { ...params };
            this.txStatusModal.showModal();
        }
        async initApprovalAction() {
            if (!this.approvalModelAction) {
                this.contractAddress = this.state.getContractAddress('Proxy');
                this.approvalModelAction = await this.state.setApprovalModelAction({
                    sender: this,
                    payAction: async () => {
                        await this.doSubmitAction();
                    },
                    onToBeApproved: async (token) => {
                        this.btnApprove.visible = true;
                        this.btnSubmit.enabled = false;
                        if (!this.isApproving) {
                            this.btnApprove.rightIcon.visible = false;
                            this.btnApprove.caption = 'Approve';
                        }
                        this.btnApprove.enabled = true;
                        this.isApproving = false;
                    },
                    onToBePaid: async (token) => {
                        this.btnApprove.visible = false;
                        this.isApproving = false;
                        this.btnSubmit.enabled = new eth_wallet_4.BigNumber(this.tokenAmountIn).gt(0);
                        this.determineBtnSubmitCaption();
                    },
                    onApproving: async (token, receipt) => {
                        this.isApproving = true;
                        this.btnApprove.rightIcon.spin = true;
                        this.btnApprove.rightIcon.visible = true;
                        this.btnApprove.caption = `Approving ${token.symbol}`;
                        this.btnSubmit.visible = false;
                        if (receipt) {
                            this.showTxStatusModal('success', receipt);
                        }
                    },
                    onApproved: async (token) => {
                        this.btnApprove.rightIcon.visible = false;
                        this.btnApprove.caption = 'Approve';
                        this.isApproving = false;
                        this.btnSubmit.visible = true;
                        this.btnSubmit.enabled = true;
                    },
                    onApprovingError: async (token, err) => {
                        this.showTxStatusModal('error', err);
                        this.btnApprove.caption = 'Approve';
                        this.btnApprove.rightIcon.visible = false;
                    },
                    onPaying: async (receipt) => {
                        if (receipt) {
                            this.showTxStatusModal('success', receipt);
                            this.btnSubmit.enabled = false;
                            this.btnSubmit.rightIcon.visible = true;
                        }
                    },
                    onPaid: async (receipt) => {
                        this.btnSubmit.rightIcon.visible = false;
                    },
                    onPayingError: async (err) => {
                        this.showTxStatusModal('error', err);
                    }
                });
                this.state.approvalModel.spenderAddress = this.contractAddress;
            }
        }
        updateContractAddress() {
            if (this.approvalModelAction) {
                if (!this._data.commissions || this._data.commissions.length == 0 || !this._data.commissions.find(v => v.chainId == this.chainId)) {
                    this.contractAddress = this.state.getContractAddress('ProductInfo');
                }
                else {
                    this.contractAddress = this.state.getContractAddress('Proxy');
                }
                this.state.approvalModel.spenderAddress = this.contractAddress;
            }
        }
        async selectToken(token) {
            const symbol = token?.symbol || '';
            this.lblBalance.caption = `${(0, index_4.formatNumber)(await (0, index_4.getTokenBalance)(this.rpcWallet, token))} ${symbol}`;
        }
        updateSubmitButton(submitting) {
            this.btnSubmit.rightIcon.spin = submitting;
            this.btnSubmit.rightIcon.visible = submitting;
        }
        determineBtnSubmitCaption() {
            if (!(0, index_5.isClientWalletConnected)()) {
                this.btnSubmit.caption = 'Connect Wallet';
            }
            else if (!this.state.isRpcWalletConnected()) {
                this.btnSubmit.caption = 'Switch Network';
            }
            else if (this._type === index_3.ProductType.Buy) {
                this.btnSubmit.caption = 'Mint';
            }
            else {
                this.btnSubmit.caption = 'Submit';
            }
        }
        onApprove() {
            this.showTxStatusModal('warning', 'Approving');
            this.approvalModelAction.doApproveAction(this.productInfo.token, this.tokenAmountIn);
        }
        async onQtyChanged() {
            const qty = Number(this.edtQty.value);
            if (qty === 0) {
                this.tokenAmountIn = '0';
                this.tokenInput.value = '0';
                this.lbOrderTotal.caption = `0 ${this.productInfo.token?.symbol || ''}`;
            }
            else {
                this.tokenAmountIn = (0, API_1.getProxyTokenAmountIn)(this.productInfo.price.toFixed(), qty, this._data.commissions);
                const price = eth_wallet_4.Utils.fromDecimals(this.productInfo.price, this.productInfo.token.decimals);
                const amount = price.times(qty);
                this.tokenInput.value = amount.toFixed();
                const commissionFee = this.state.embedderCommissionFee;
                const total = amount.plus(amount.times(commissionFee));
                this.lbOrderTotal.caption = `${(0, index_4.formatNumber)(total)} ${this.productInfo.token?.symbol || ''}`;
            }
            if (this.productInfo && this.state.isRpcWalletConnected())
                this.approvalModelAction.checkAllowance(this.productInfo.token, this.tokenAmountIn);
        }
        async onAmountChanged() {
            let amount = Number(this.tokenInput.value);
            if (amount === 0 || !this.productInfo) {
                this.tokenAmountIn = '0';
                this.tokenInput.value = '0';
            }
            else {
                this.tokenAmountIn = (0, API_1.getProxyTokenAmountIn)(this.productInfo.price.toFixed(), amount, this._data.commissions);
            }
            amount = Number(this.tokenInput.value);
            const commissionFee = this.state.embedderCommissionFee;
            const total = new eth_wallet_4.BigNumber(amount).plus(new eth_wallet_4.BigNumber(amount).times(commissionFee));
            const token = this.productInfo?.token;
            this.lbOrderTotal.caption = `${(0, index_4.formatNumber)(total)} ${token?.symbol || ''}`;
            if (token && this.state.isRpcWalletConnected())
                this.approvalModelAction.checkAllowance(token, this.tokenAmountIn);
        }
        async doSubmitAction() {
            if (!this._data || !this.productId)
                return;
            this.updateSubmitButton(true);
            if ((this._type === index_3.ProductType.DonateToOwner || this._type === index_3.ProductType.DonateToEveryone) && !this.tokenInput.token) {
                this.showTxStatusModal('error', 'Token Required');
                this.updateSubmitButton(false);
                return;
            }
            // if (this._type === ProductType.Buy && chainId !== this._data.chainId) {
            //   this.showTxStatusModal('error', 'Unsupported Network');
            //   this.updateSubmitButton(false);
            //   return;
            // }
            const token = this.productInfo.token;
            const balance = await (0, index_4.getTokenBalance)(this.rpcWallet, token);
            if (this._type === index_3.ProductType.Buy) {
                if (this.edtQty.value && new eth_wallet_4.BigNumber(this.edtQty.value).gt(this.productInfo.maxQuantity)) {
                    this.showTxStatusModal('error', 'Quantity Greater Than Max Quantity');
                    this.updateSubmitButton(false);
                    return;
                }
                if (this.productInfo.maxQuantity.gt(1) && (!this.edtQty.value || !Number.isInteger(Number(this.edtQty.value)))) {
                    this.showTxStatusModal('error', 'Invalid Quantity');
                    this.updateSubmitButton(false);
                    return;
                }
                const requireQty = this.productInfo.maxQuantity.gt(1) && this.edtQty.value ? Number(this.edtQty.value) : 1;
                if (this.productId >= 0) {
                    const product = await (0, API_1.getProductInfo)(this.state, this.productId);
                    if (product.quantity.lt(requireQty)) {
                        this.showTxStatusModal('error', 'Out of stock');
                        this.updateSubmitButton(false);
                        return;
                    }
                }
                const maxOrderQty = new eth_wallet_4.BigNumber(this.productInfo.maxQuantity ?? 0);
                if (maxOrderQty.minus(requireQty).lt(0)) {
                    this.showTxStatusModal('error', 'Over Maximum Order Quantity');
                    this.updateSubmitButton(false);
                    return;
                }
                const amount = this.productInfo.price.times(requireQty).shiftedBy(-token.decimals);
                if (balance.lt(amount)) {
                    this.showTxStatusModal('error', `Insufficient ${this.tokenInput.token.symbol} Balance`);
                    this.updateSubmitButton(false);
                    return;
                }
                await this.buyToken(requireQty);
            }
            else {
                if (!this.tokenInput.value) {
                    this.showTxStatusModal('error', 'Amount Required');
                    this.updateSubmitButton(false);
                    return;
                }
                if (balance.lt(this.tokenInput.value)) {
                    this.showTxStatusModal('error', `Insufficient ${this.tokenInput.token.symbol} Balance`);
                    this.updateSubmitButton(false);
                    return;
                }
                await this.buyToken(1);
            }
            this.updateSubmitButton(false);
        }
        async onSubmit() {
            if (!(0, index_5.isClientWalletConnected)()) {
                if (this.mdWallet) {
                    await components_4.application.loadPackage('@scom/scom-wallet-modal', '*');
                    this.mdWallet.networks = this.networks;
                    this.mdWallet.wallets = this.wallets;
                    this.mdWallet.showModal();
                }
                return;
            }
            if (!this.state.isRpcWalletConnected()) {
                const clientWallet = eth_wallet_4.Wallet.getClientInstance();
                await clientWallet.switchNetwork(this.chainId);
                return;
            }
            this.showTxStatusModal('warning', 'Confirming');
            this.approvalModelAction.doPayAction();
        }
        async buyToken(quantity) {
            if (this.productId === undefined || this.productId === null)
                return;
            const callback = (error, receipt) => {
                if (error) {
                    this.showTxStatusModal('error', error);
                }
            };
            const token = this.productInfo.token;
            if (this._data.productType == index_3.ProductType.DonateToOwner || this._data.productType == index_3.ProductType.DonateToEveryone) {
                await (0, API_1.donate)(this.state, this.productId, this.donateTo, this.tokenInput.value, this._data.commissions, token, callback, async () => {
                    await this.updateTokenBalance();
                });
            }
            else if (this._data.productType == index_3.ProductType.Buy) {
                await (0, API_1.buyProduct)(this.state, this.productId, quantity, this._data.commissions, token, callback, async () => {
                    await this.updateTokenBalance();
                    this.updateSpotsRemaining();
                });
            }
        }
        async init() {
            super.init();
            const lazyLoad = this.getAttribute('lazyLoad', true, false);
            if (!lazyLoad) {
                const link = this.getAttribute('link', true);
                const productType = this.getAttribute('productType', true);
                const name = this.getAttribute('name', true);
                const title = this.getAttribute('title', true);
                const description = this.getAttribute('description', true);
                const logoUrl = this.getAttribute('logoUrl', true);
                const chainSpecificProperties = this.getAttribute('chainSpecificProperties', true);
                const networks = this.getAttribute('networks', true);
                const wallets = this.getAttribute('wallets', true);
                const showHeader = this.getAttribute('showHeader', true);
                const defaultChainId = this.getAttribute('defaultChainId', true);
                await this.setData({
                    link,
                    productType,
                    name,
                    title,
                    chainSpecificProperties,
                    defaultChainId,
                    description,
                    logoUrl,
                    networks,
                    wallets,
                    showHeader
                });
            }
            this.executeReadyCallback();
        }
        render() {
            return (this.$render("i-panel", null,
                this.$render("i-scom-dapp-container", { id: "containerDapp" },
                    this.$render("i-panel", { background: { color: Theme.background.main } },
                        this.$render("i-grid-layout", { id: 'gridDApp', width: '100%', height: '100%', templateColumns: ['1fr'], padding: { bottom: '1.563rem' } },
                            this.$render("i-vstack", { gap: "0.5rem", padding: { top: '1.75rem', bottom: '1rem', left: '1rem', right: '1rem' }, verticalAlignment: 'space-between' },
                                this.$render("i-vstack", { class: "text-center", margin: { bottom: '0.25rem' }, gap: "0.5rem" },
                                    this.$render("i-image", { id: 'imgLogo', height: 100, border: { radius: 4 } }),
                                    this.$render("i-label", { id: 'lblTitle', font: { bold: true, size: '1.5rem' } }),
                                    this.$render("i-markdown", { id: 'markdownViewer', class: index_css_1.markdownStyle, width: '100%', height: '100%', margin: { bottom: '0.563rem' } })),
                                this.$render("i-hstack", { id: 'pnlMintFee', visible: false, gap: '0.25rem' },
                                    this.$render("i-label", { caption: 'Mint Fee:', font: { bold: true, size: '0.875rem' } }),
                                    this.$render("i-label", { id: 'lblMintFee', font: { size: '0.875rem' } })),
                                this.$render("i-hstack", { id: 'pnlSpotsRemaining', visible: false, gap: '0.25rem' },
                                    this.$render("i-label", { caption: 'Spots Remaining:', font: { bold: true, size: '0.875rem' } }),
                                    this.$render("i-label", { id: 'lblSpotsRemaining', font: { size: '0.875rem' } })),
                                this.$render("i-hstack", { id: 'pnlMaxQty', visible: false, gap: '0.25rem' },
                                    this.$render("i-label", { caption: 'Max Quantity per Order:', font: { bold: true, size: '0.875rem' } }),
                                    this.$render("i-label", { id: 'lblMaxQty', font: { size: '0.875rem' } })),
                                this.$render("i-vstack", { gap: '0.5rem' },
                                    this.$render("i-vstack", { gap: '0.5rem', id: 'pnlInputFields' },
                                        this.$render("i-vstack", { gap: '0.25rem', margin: { bottom: '1rem' } },
                                            this.$render("i-hstack", { id: 'pnlQty', visible: false, horizontalAlignment: 'center', verticalAlignment: 'center', gap: "0.5rem", width: "50%", margin: { top: '0.75rem', left: 'auto', right: 'auto' } },
                                                this.$render("i-label", { caption: 'Qty', font: { weight: 500, size: '1rem' } }),
                                                this.$render("i-input", { id: 'edtQty', onChanged: this.onQtyChanged.bind(this), class: index_css_1.inputStyle, inputType: 'number', font: { size: '0.875rem' }, border: { radius: 4, style: 'none' }, padding: { top: '0.25rem', bottom: '0.25rem', left: '0.5rem', right: '0.5rem' } })),
                                            this.$render("i-hstack", { horizontalAlignment: 'space-between', verticalAlignment: 'center', gap: "0.5rem" },
                                                this.$render("i-label", { id: "lblYouPay", font: { weight: 500, size: '1rem' } }),
                                                this.$render("i-hstack", { horizontalAlignment: 'end', verticalAlignment: 'center', gap: "0.5rem", opacity: 0.6 },
                                                    this.$render("i-label", { caption: 'Balance:', font: { size: '1rem' } }),
                                                    this.$render("i-label", { id: 'lblBalance', font: { size: '1rem' }, caption: "0.00" }))),
                                            this.$render("i-grid-layout", { templateColumns: ['100%'], overflow: "hidden", background: { color: Theme.input.background }, font: { color: Theme.input.fontColor }, height: 56, width: "50%", margin: { left: 'auto', right: 'auto' }, verticalAlignment: "center", border: { radius: 16, width: '2px', style: 'solid', color: 'transparent' } },
                                                this.$render("i-scom-token-input", { id: "tokenInput", tokenReadOnly: true, isBtnMaxShown: false, isCommonShown: false, isBalanceShown: false, isSortBalanceShown: false, class: index_css_1.tokenSelectionStyle, padding: { left: '11px' }, font: { size: '1.25rem' }, width: "100%", height: "100%", placeholder: "0.00", modalStyles: {
                                                        maxHeight: '50vh'
                                                    }, onSelectToken: this.selectToken, onInputAmountChanged: this.onAmountChanged })),
                                            this.$render("i-vstack", { horizontalAlignment: "center", verticalAlignment: 'center', gap: "8px", width: "50%", margin: { top: '0.75rem', left: 'auto', right: 'auto' } },
                                                this.$render("i-button", { id: "btnApprove", width: '100%', caption: "Approve", padding: { top: '1rem', bottom: '1rem', left: '1rem', right: '1rem' }, font: { size: '1rem', color: Theme.colors.primary.contrastText, bold: true }, rightIcon: { visible: false, fill: Theme.colors.primary.contrastText }, border: { radius: 12 }, visible: false, onClick: this.onApprove.bind(this) }),
                                                this.$render("i-button", { id: 'btnSubmit', width: '100%', caption: 'Submit', padding: { top: '1rem', bottom: '1rem', left: '1rem', right: '1rem' }, font: { size: '1rem', color: Theme.colors.primary.contrastText, bold: true }, rightIcon: { visible: false, fill: Theme.colors.primary.contrastText }, background: { color: Theme.background.gradient }, border: { radius: 12 }, onClick: this.onSubmit.bind(this), enabled: false }))),
                                        this.$render("i-hstack", { horizontalAlignment: "space-between", verticalAlignment: 'center' },
                                            this.$render("i-hstack", { verticalAlignment: 'center', gap: "0.5rem" },
                                                this.$render("i-label", { id: "lbOrderTotalTitle", caption: 'Total', font: { size: '1rem' } }),
                                                this.$render("i-icon", { id: "iconOrderTotal", name: "question-circle", fill: Theme.background.modal, width: 20, height: 20 })),
                                            this.$render("i-label", { id: 'lbOrderTotal', font: { size: '1rem' }, caption: "0" })),
                                        this.$render("i-vstack", { gap: '0.25rem', margin: { top: '1rem' } },
                                            this.$render("i-label", { id: 'lblRef', font: { size: '0.875rem' }, opacity: 0.5 }),
                                            this.$render("i-label", { id: 'lblAddress', font: { size: '0.875rem' }, overflowWrap: 'anywhere' }))),
                                    this.$render("i-vstack", { id: 'pnlUnsupportedNetwork', visible: false, horizontalAlignment: 'center' },
                                        this.$render("i-label", { caption: 'This network is not supported.', font: { size: '1.5rem' } })),
                                    this.$render("i-label", { caption: 'Terms & Condition', font: { size: '0.875rem' }, link: { href: 'https://docs.scom.dev/' }, opacity: 0.6, margin: { top: '1rem' } }))),
                            this.$render("i-hstack", { id: 'pnlLink', visible: false, verticalAlignment: 'center', gap: '0.25rem', padding: { top: '0.5rem', bottom: '0.5rem', left: '0.5rem', right: '0.5rem' } },
                                this.$render("i-label", { caption: 'Details here: ', font: { size: '1rem' } }),
                                this.$render("i-label", { id: 'lblLink', font: { size: '1rem' } }))),
                        this.$render("i-scom-wallet-modal", { id: "mdWallet", wallets: [] }),
                        this.$render("i-scom-tx-status-modal", { id: "txStatusModal" })))));
        }
    };
    ScomNftMinter = __decorate([
        components_4.customModule,
        (0, components_4.customElements)('i-scom-nft-minter')
    ], ScomNftMinter);
    exports.default = ScomNftMinter;
});
