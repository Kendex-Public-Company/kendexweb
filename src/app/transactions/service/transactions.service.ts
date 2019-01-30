import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject, } from 'rxjs';
import { NemProvider } from "../../shared/services/nem.provider";
import { UInt64, TransferTransaction, Deadline, PlainMessage, NetworkType, TransactionHttp, Account, Mosaic, MosaicId } from "proximax-nem2-sdk";
import { WalletService } from "../../shared/services/wallet.service";
import { NodeService } from '../../servicesModule/services/node.service';
import { environment } from 'src/environments/environment';
import { MessageService } from '../../shared/services/message.service';

@Injectable({
  providedIn: 'root'
})
export class TransactionsService {

  private _transConfirmSubject: BehaviorSubject<any> =  new BehaviorSubject<any>([]);
  private _transConfirm$: Observable<any> = this._transConfirmSubject.asObservable();
  private _transactionsUnconfirmed = new BehaviorSubject<any>([]);
  private _transactionsUnconfirmed$: Observable<any> = this._transactionsUnconfirmed.asObservable();


  constructor(
    private nemProvider: NemProvider,
    private nodeService: NodeService,
    private walletService: WalletService,
    private messageService: MessageService
  ) {
  }

  destroyAllTransactions() {
    this.setConfirmedTransaction$([]);
    this.setTransactionsUnconfirmed$([]);
  }

  getConfirmedTransactionsCache$(): Observable<any> {
    console.log("Método que devuelve las transacciones en caché");
    this.messageService.changeMessage('balanceChanged');
    return this._transConfirm$;

  }

  setConfirmedTransaction$(data) {
    console.log("Establece las transacciones confirmadas");
    this._transConfirmSubject.next(data);
  }

  getTransactionsUnconfirmedCache$(): Observable<any> {
    return this._transactionsUnconfirmed$;
  }

  setTransactionsUnconfirmed$(data) {
    this._transactionsUnconfirmed.next(data);
  }


  buildToSendTransfer(common: { password?: any; privateKey?: any; }, recipient: string, message: string, amount: any, network: NetworkType) {
    console.log("Aqui construye la transaccion");
    const recipientAddress = this.nemProvider.createFromRawAddress(recipient);
    const transferTransaction = TransferTransaction.create(
      Deadline.create(5),
      recipientAddress,
      //[new Mosaic(new MosaicId([3530084852,3559101211]),UInt64.fromUint(0))],
      [new Mosaic( new MosaicId(this.nemProvider.mosaic), UInt64.fromUint(Number(amount)))],
      PlainMessage.create(message),
      network);
    const account = Account.createFromPrivateKey(common.privateKey, network);
    const signedTransaction = account.sign(transferTransaction);
    const transactionHttp = new TransactionHttp(environment.protocol + '://' + `${this.nodeService.getNodeSelected()}`);
    return {
      signedTransaction: signedTransaction,
      transactionHttp: transactionHttp
    };
  }


  formatTransaction(data: any) {
    const date = `${data.deadline.value.monthValue()}/${data.deadline.value.dayOfMonth()}/${data.deadline.value.year()}`;
    const isRemitent = this.walletService.address.pretty() === data.recipient.pretty();
    // console.log(data);
    return {
      address: data.recipient.pretty(),
      amount: data['amount'],
      message: data['message'],
      transactionInfo: data.transactionInfo,
      fee: data.fee.compact(),
      mosaic: 'xpx',
      date: date,
      recipient: data.recipient.pretty(),
      signer: data.signer.address.pretty(),
      isRemitent: isRemitent
    };
  }
}
