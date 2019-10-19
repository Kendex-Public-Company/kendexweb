import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { first, timeout } from 'rxjs/operators';
import { PlainMessage, TransferTransaction, MultisigTransaction, Account } from 'nem-library';
import { PublicAccount } from 'tsjs-xpx-chain-sdk';
import { Subscription } from 'rxjs';

import { WalletService, AccountCreatedInterface, TransactionsNis1Interface } from '../../../wallet/services/wallet.service';
import { AppConfig } from '../../../config/app.config';
import { SharedService, ConfigurationForm } from '../../../shared/services/shared.service';
import { NemProviderService, AccountsInfoNis1Interface, WalletTransactionsNis1Interface } from '../../services/nem-provider.service';

@Component({
  selector: 'app-nis1-transfer-assets',
  templateUrl: './nis1-transfer-assets.component.html',
  styleUrls: ['./nis1-transfer-assets.component.css']
})
export class Nis1TransferAssetsComponent implements OnInit {

  accountToSwap: AccountsInfoNis1Interface = null;
  amountZero: boolean = false;
  blockButton: boolean;
  configurationForm: ConfigurationForm;
  currentAccountCreated: AccountCreatedInterface;
  errorAmount: string;
  formTransfer: FormGroup;
  insufficientBalance = false;
  maxAmount: number = 0;
  mainAccount = false;
  optionsXPX = {
    prefix: '',
    thousands: ',',
    decimal: '.',
    precision: '6'
  };
  ownedAccountSwap: AccountsInfoNis1Interface = null;
  passwordMain: string = 'password';
  processing: boolean = false;
  quantity: string = '0.000000';
  routeGoHome = `/${AppConfig.routes.home}`;
  spinnerVisibility = false;
  showCertifiedSwap = false;
  subscription: Subscription[] = [];
  isMultisig = null;
  transactionNis1: TransactionsNis1Interface;
  routeContinue: string;

  constructor(
    private activateRoute: ActivatedRoute,
    private fb: FormBuilder,
    private router: Router,
    private nemProvider: NemProviderService,
    private sharedService: SharedService,
    private walletService: WalletService
  ) { }

  ngOnInit() {
    this.accountToSwap = null;
    this.configurationForm = this.sharedService.configurationForm;
    this.initComponent();
  }

  ngOnDestroy(): void {
    this.subscription.forEach(subscription => {
      subscription.unsubscribe();
    });
  }

  /**
  *
  *
  * @memberof Nis1TransferAssetsComponent
  */
  async createTransaction() {
    if (!this.processing) {
      this.processing = true;
      let common = { password: this.formTransfer.get("password").value };
      if (this.currentAccountCreated) {
        if (this.walletService.decrypt(common, this.currentAccountCreated.dataAccount)) {
          const account = this.nemProvider.createAccountPrivateKey(common['privateKey']);
          const quantity = this.formTransfer.get("amountXpx").value;
          if (this.isMultisig) {
            const assetId = this.accountToSwap.mosaic.assetId;
            const msg = PlainMessage.create(this.accountToSwap.accountCosignatory.publicKey);
            const transaction = await this.nemProvider.createTransaction(msg, assetId, quantity);
            const publicAccountMultisig = this.nemProvider.createPublicAccount(this.accountToSwap.publicKey);
            this.nemProvider.createTransactionMultisign(transaction, publicAccountMultisig).then(next => {
              this.anounceTransaction(next, account, this.currentAccountCreated.dataAccount.publicAccount);
            }).catch(error => {
              this.spinnerVisibility = false;
              this.processing = false;
              this.sharedService.showError('', error.toString().split('_').join(' '));
              this.router.navigate([`/${AppConfig.routes.home}`]);
            });
          } else if (!this.isMultisig) {
            const assetId = this.ownedAccountSwap.mosaic.assetId;
            const msg = PlainMessage.create(this.currentAccountCreated.dataAccount.publicAccount.publicKey);
            const transaction = await this.nemProvider.createTransaction(msg, assetId, quantity);
            this.anounceTransaction(transaction, account, this.currentAccountCreated.dataAccount.publicAccount);
          }
        } else {
          this.spinnerVisibility = false;
          this.processing = false;
        }
      } else {
        this.router.navigate([`/${AppConfig.routes.home}`]);
      }
    }
  }

  /**
   *
   *
   * @param {*} signed
   * @param {*} account
   * @param {*} catapultAccount
   * @param {*} transaction
   * @memberof Nis1TransferAssetsComponent
   */
  anounceTransaction(transaction: TransferTransaction | MultisigTransaction, account: Account, catapultAccount: any) {
    this.nemProvider.anounceTransaction(transaction, account).pipe(first()).pipe((timeout(15000))).subscribe(next => {
      if (next && next['message'] && next['message'].toLowerCase() === 'success') {
        console.log('RESPONSE ANNOUNCE --->', next);
        console.log('ACCOUNT WALLET CREATED --->', this.walletService.accountWalletCreated);
        const year = transaction.timeWindow.timeStamp['_date']['_year'];
        const month = transaction.timeWindow.timeStamp['_date']['_month'];
        const day = transaction.timeWindow.timeStamp['_date']['_day'];
        const hour = transaction.timeWindow.timeStamp['_time']['_hour'];
        const minutes = transaction.timeWindow.timeStamp['_time']['_minute'];
        const seconds = transaction.timeWindow.timeStamp['_time']['_second'];
        this.routeContinue = `/${AppConfig.routes.home}`;
        this.transactionNis1 = {
            siriusAddres: catapultAccount.address.pretty(),
            nis1Timestamp: `${year}-${month}-${day} ${hour}:${minutes}:${seconds}`,
            nis1PublicKey: transaction.signer.publicKey,
            nis1TransactionHash: next['transactionHash'].data
        };

        const transactionWalletNis1: WalletTransactionsNis1Interface = {
          name: name,
          transactions: [this.transactionNis1]
        };

        this.nemProvider.saveAccountWalletTransNisStorage(transactionWalletNis1);
        this.processing = false;
        this.spinnerVisibility = false;
        this.showCertifiedSwap = true;
        this.walletService.accountWalletCreated = null;
        this.sharedService.showSuccess('', next['message']);
      } else {
        this.showCertifiedSwap = false;
        this.nemProvider.validateCodeMsgError(next['code'], next['message']);
        this.spinnerVisibility = false
        this.processing = false;
      }

      /*let wallet;
      if (this.walletService.getCurrentWallet()) {
        wallet = this.walletService.getWalletTransNisStorage().find(el => el.name === this.walletService.getCurrentWallet().name);
      } else {
        wallet = this.walletService.getWalletTransNisStorage().find(el => el.name === this.walletService.accountWalletCreated.wallet.name);
      }

      if (wallet !== undefined && wallet !== null) {
        wallet.transactions.push({
          siriusAddres: catapultAccount.address.pretty(),
          nis1Timestamp: `${transaction.timeWindow.timeStamp['_date']['_year']}-${transaction.timeWindow.timeStamp['_date']['_month']}-${transaction.timeWindow.timeStamp['_date']['_day']} ${transaction.timeWindow.timeStamp['_time']['_hour']}:${transaction.timeWindow.timeStamp['_time']['_minute']}:${transaction.timeWindow.timeStamp['_time']['_second']}`,
          nis1PublicKey: transaction.signer.publicKey,
          nis1TransactionHash: next['transactionHash'].data
        });
      } else {
        wallet = {
          name: (this.walletService.getCurrentWallet()) ? this.walletService.currentWallet.name : this.walletService.accountWalletCreated.wallet.name,
          transactions: [{
            siriusAddres: catapultAccount.address.pretty(),
            nis1Timestamp: `${transaction.timeWindow.timeStamp['_date']['_year']}-${transaction.timeWindow.timeStamp['_date']['_month']}-${transaction.timeWindow.timeStamp['_date']['_day']} ${transaction.timeWindow.timeStamp['_time']['_hour']}:${transaction.timeWindow.timeStamp['_time']['_minute']}:${transaction.timeWindow.timeStamp['_time']['_second']}`,
            nis1PublicKey: transaction.signer.publicKey,
            nis1TransactionHash: next['transactionHash'].data
          }]
        };
      }
      // console.log('\n\n\n\nValue resp:\n', wallet, '\n\n\n\nEnd value\n\n');
      this.walletService.setSwapTransactions$(wallet.transactions);
      this.walletService.saveAccountWalletTransNisStorage(wallet);
      this.sharedService.showSuccess('Transaction', next['message']);
      this.walletService.accountWalletCreated = null;
      this.processing = false;*/
      /*this.changeView.emit({
        transaction: transaction,
        details: next,
        catapultAccount: catapultAccount,
        route: this.routeEvent
      });*/


    }, error => {
      console.log(error);
      this.nemProvider.validateCodeMsgError(error.error.code, error.error.message);
      this.spinnerVisibility = false
      this.processing = false;
    });
  }

  /**
   *
   *
   * @memberof Nis1TransferAssetsComponent
   */
  createFormTransfer() {
    this.formTransfer = this.fb.group({
      /* accountRecipient: (this.accountSelected.multiSign) ? ['', [
         Validators.required,
         Validators.minLength(this.configurationForm.address.minLength),
         Validators.maxLength(this.configurationForm.address.maxLength)]] : ['', []],*/


      amountXpx: ['', [
        Validators.required,
        Validators.maxLength(this.configurationForm.amount.maxLength)
      ]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(this.configurationForm.passwordWallet.minLength),
          Validators.maxLength(this.configurationForm.passwordWallet.maxLength)
        ]
      ]
    });
  }

  /**
   *
   *
   * @param {*} inputType
   * @memberof Nis1TransferAssetsComponent
   */
  changeInputType(inputType: string) {
    this.passwordMain = this.sharedService.changeInputType(inputType)
  }


  /**
   *
   *
   * @param {string} quantity
   * @returns
   * @memberof Nis1TransferAssetsComponent
   */
  getQuantity(quantity: string) {
    return this.sharedService.amountFormat(quantity);
  }

  /**
   *
   *
   * @memberof Nis1TransferAssetsComponent
   */
  initComponent() {
    this.currentAccountCreated = this.walletService.accountWalletCreated;
    const accountSelected = this.nemProvider.getSelectedNis1Account();
    if (accountSelected) {
      const account = this.activateRoute.snapshot.paramMap.get('account');
      const type = this.activateRoute.snapshot.paramMap.get('type');
      this.ownedAccountSwap = accountSelected;
      if (account && type) {
        this.isMultisig = (type === '1') ? false : true;
        if (!this.isMultisig && accountSelected.address.plain() === account.replace(/-/g, '')) {
          // SIMPLE ACCOUNT
          this.accountToSwap = accountSelected;
          this.quantity = this.accountToSwap.balance;
          this.maxAmount = this.quantity.length;
          this.showCertifiedSwap = false;
          this.createFormTransfer();
          this.subscribeAmount();
        } else if (this.isMultisig && accountSelected.multisigAccountsInfo.length > 0) {
          // MULTISIG ACCOUNT
          const multisigAccounts = accountSelected.multisigAccountsInfo;
          const accountFiltered = multisigAccounts.find(ac => ac.address === account.replace(/-/g, ''));
          if (accountFiltered) {
            this.accountToSwap = accountFiltered;
            this.accountToSwap.address = this.nemProvider.createAddressToString(accountFiltered.address);
            this.accountToSwap.nameAccount = accountSelected.nameAccount;
            const publicAccount = PublicAccount.createFromPublicKey(
              this.currentAccountCreated.dataAccount.publicAccount.publicKey,
              this.currentAccountCreated.dataAccount.network
            );
            this.accountToSwap.accountCosignatory = publicAccount;
            this.quantity = this.accountToSwap.balance;
            this.maxAmount = this.quantity.length;
            this.showCertifiedSwap = false;
            this.createFormTransfer();
            this.subscribeAmount();
          }
        }
      }
    }

    console.log('accountToSwap ----> ', this.accountToSwap);
    console.log('currentAccountCreated ----> ', this.currentAccountCreated);

    if (!this.accountToSwap) {
      this.router.navigate([`/${AppConfig.routes.home}`]);
    }
  }

  /**
   *
   *
   * @memberof Nis1TransferAssetsComponent
   */
  selectMaxAmount() {
    this.formTransfer.get('amountXpx').setValue(this.quantity.split(',').join(''));
  }

  /**
   *
   *
   * @memberof Nis1TransferAssetsComponent
   */
  subscribeAmount() {
    this.subscription.push(
      this.formTransfer.get('amountXpx').valueChanges.subscribe(
        next => {
          if (next !== null && next !== undefined) {
            if (next > parseFloat(this.quantity.split(',').join(''))) {
              this.blockButton = true;
              this.errorAmount = '-invalid';
              this.amountZero = false;
              this.insufficientBalance = true;
            } else if (next === 0) {
              this.blockButton = true;
              this.insufficientBalance = false;
              this.errorAmount = '-invalid';
              this.amountZero = true;
            } else {
              this.blockButton = false;
              this.insufficientBalance = false;
              this.amountZero = false;
              this.errorAmount = '';
            }
          }
        }
      )
    );
  }

  /**
   *
   *
   * @param {string} [nameInput='']
   * @param {string} [nameControl='']
   * @param {string} [nameValidation='']
   * @returns
   * @memberof Nis1TransferAssetsComponent
   */
  validateInput(nameInput: string = '', nameControl: string = '', nameValidation: string = '') {
    let validation: AbstractControl = null;
    if (nameInput !== '' && nameControl !== '') {
      validation = this.formTransfer.controls[nameControl].get(nameInput);
    } else if (nameInput === '' && nameControl !== '' && nameValidation !== '') {
      validation = this.formTransfer.controls[nameControl].getError(nameValidation);
    } else if (nameInput !== '') {
      validation = this.formTransfer.get(nameInput);
    }
    return validation;
  }
}
