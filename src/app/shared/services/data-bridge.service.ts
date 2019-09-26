import { Injectable } from '@angular/core';
import { first } from "rxjs/operators";
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { Listener, Transaction, TransactionStatus, CosignatureSignedTransaction, BlockInfo, SignedTransaction, UInt64, AggregateTransaction, Address } from "tsjs-xpx-chain-sdk";
import { environment } from '../../../environments/environment';
import { NodeService } from '../../servicesModule/services/node.service';
import { SharedService } from './shared.service';
import { WalletService, CurrentWalletInterface } from '../../wallet/services/wallet.service';
import { TransactionsService } from '../../transactions/services/transactions.service';
import { ProximaxProvider } from './proximax.provider';
import { NamespacesService } from 'src/app/servicesModule/services/namespaces.service';

@Injectable({
  providedIn: 'root'
})
export class DataBridgeService {
  block: number;
  url: any
  connector: Listener[] = [];
  currentWallet: CurrentWalletInterface = null;
  destroyConection = false;
  blockSubject: BehaviorSubject<number> = new BehaviorSubject<number>(this.block);
  blockInfo: BlockInfo;
  blockInfoSubject: BehaviorSubject<BlockInfo> = new BehaviorSubject<BlockInfo>(this.blockInfo);
  block$: Observable<number> = this.blockSubject.asObservable();
  blockInfo$: Observable<BlockInfo> = this.blockInfoSubject.asObservable();
  transactionSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  transaction$: Observable<any> = this.transactionSubject.asObservable();
  reconnectNode = 0;
  subscription: Subscription[] = [];



  constructor(
    private walletService: WalletService,
    private transactionsService: TransactionsService,
    private nodeService: NodeService,
    private sharedService: SharedService,
    private proximaxProvider: ProximaxProvider,
    private namespaces: NamespacesService
  ) { }


  /**
   *
   *
   * @memberof DataBridgeService
   */
  async searchBlockInfo() {
    this.proximaxProvider.getBlockchainHeight().subscribe(
      (blockchainHeight: UInt64) => {
        this.proximaxProvider.getBlockInfo().subscribe(
          (BlockInfo: BlockInfo) => {
            this.setblock(blockchainHeight.compact());
            this.setblockInfo(BlockInfo);
          }
        );
      }
    );
  }

  /**
   * Connect to websocket
   *
   * @param {string} node
   * @returns
   * @memberof DataBridgeService
   */
  connectnWs(node?: string) {
    this.connector = [];
    const route = (node === undefined) ? this.nodeService.getNodeSelected() : node;
    this.url = `${environment.protocolWs}://${route}`;
    this.currentWallet = Object.assign({}, this.walletService.getCurrentWallet());
    this.currentWallet.accounts.forEach(element => {
      const ad = this.proximaxProvider.createFromRawAddress(element.address);
      const b = new Listener(this.url, WebSocket);
      this.connector.push(b);
      b.open().then(() => {
        const audio = new Audio('assets/audio/ding.ogg');
        const audio2 = new Audio('assets/audio/ding2.ogg');
        this.getBlockSocket(b);
        this.getAggregateBondedAddedSocket(b, audio, ad);
        this.getAggregateBondedRemovedSocket(b, audio2, ad);
        this.getCosignatureAddedSocket(b, audio, ad);
        this.getConfirmedSocket(b, audio, ad);
        this.getStatusSocket(b, audio2, ad);
        this.getUnConfirmedAddedSocket(b, audio2, ad);
        this.getUnConfirmedRemovedSocket(b, audio2, ad);
      }, (error) => {
        this.sharedService.showWarning('', 'Error connecting to the node');
      });
    });
    return;
  }

  /**
   * Close connection websocket
   *
   * @memberof DataBridgeService
   */
  closeConection(destroyTransactions = true) {
    this.destroySubscriptions();
    this.destroyConection = true;
    if (destroyTransactions) {
      this.setblock(null);
      this.setTransactionStatus(null);
      this.transactionsService.destroyAllTransactions();
    }

    if (this.connector.length > 0) {
      console.log("Destruye conexion con el websocket");
      this.connector.forEach(element => {
        element.close();
        element.terminate();
      });
    }
  }


  /**
   *
   */
  destroySubscriptions() {
    this.subscription.forEach(subscription => {
      subscription.unsubscribe();
    });
  }


  /**
  *
  * @returns
  * @memberof DataBridgeService
  */
  getBlock() {
    return this.block$;
  }

  /**
  * Get the status from the block
  *
  * @param {Listener} connector
  * @param {HTMLAudioElement} audio
  * @memberof DataBridgeService
  */
  getBlockSocket(connector: Listener) {
    connector.newBlock().subscribe(res => {
      this.setblock(res.height.compact())
    }, err => {
      this.sharedService.showError('Error', err);
    });
  }


  /**
   *
   *
   * @param {Listener} connector
   * @param {HTMLAudioElement} audio
   * @memberof DataBridgeService
   */
  getAggregateBondedAddedSocket(connector: Listener, audio: HTMLAudioElement, address: Address) {
   /* const currentWallet = Object.assign({}, this.walletService.getCurrentWallet());
    currentWallet.accounts.forEach(element => {*/
      // ----------------------------------AGGREGATE_BONDED_ADDED--------------------------------------------//
      connector.aggregateBondedAdded(address).subscribe(async aggregateBondedAdded => {
        console.log("\n\n--------------------AGGREGATE_BONDED_ADDED------------------------")
        console.log(aggregateBondedAdded.transactionInfo.hash)
        console.log("------------------------------------------------------------------\n\n")
        this.setTransactionStatus({
          'type': 'aggregateBondedAdded',
          'hash': aggregateBondedAdded.transactionInfo.hash
        });

        const aggregateBondedCache = await this.transactionsService.getAggregateBondedTransactions$().pipe(first()).toPromise();
        const transactionPushed = aggregateBondedCache.slice(0);
        const transactionFormatter = this.transactionsService.getStructureDashboard(aggregateBondedAdded, transactionPushed);
        if (transactionFormatter !== null) {
          audio.play();
          this.sharedService.showInfo('', 'Transaction aggregate bonded added');
          transactionPushed.unshift(transactionFormatter);
          this.transactionsService.setTransactionsAggregateBonded$(transactionPushed);
        }
      });
   // });
  }

  /**
   *
   *
   * @param {Listener} connector
   * @param {HTMLAudioElement} audio
   * @memberof DataBridgeService
   */
  getAggregateBondedRemovedSocket(connector: Listener, audio: HTMLAudioElement, address: Address) {
    /*const currentWallet = Object.assign({}, this.walletService.getCurrentWallet());
    currentWallet.accounts.forEach(element => {*/
      // ----------------------------------AGGREGATE_BONDED_REMOVED--------------------------------------------//
      connector.aggregateBondedRemoved(address).subscribe(async aggregateBondedRemoved => {
        console.log("\n\n-----------------------AGGREGATE_BONDED_REMOVED--------------------------")
        console.log(aggregateBondedRemoved)
        console.log("------------------------------------------------------------------\n\n")
        this.setTransactionStatus({
          'type': 'aggregateBondedRemoved',
          'hash': aggregateBondedRemoved
        });

        const agregateBondedTransactions = await this.transactionsService.getAggregateBondedTransactions$().pipe(first()).toPromise();
        if (agregateBondedTransactions && agregateBondedTransactions.length > 0) {
          const filtered = agregateBondedTransactions.filter(next => next.data.transactionInfo.hash !== aggregateBondedRemoved);
          this.transactionsService.setTransactionsAggregateBonded$(filtered);
        }
      });
    //});
  }

  /**
   *
   *
   * @param {Listener} connector
   * @param {HTMLAudioElement} audio
   * @memberof DataBridgeService
   */
  getCosignatureAddedSocket(connector: Listener, audio: HTMLAudioElement, address: Address) {
    /*const currentWallet = Object.assign({}, this.walletService.getCurrentWallet());
    currentWallet.accounts.forEach(element => {*/
      // ----------------------------------COSIGNATURE_ADDED--------------------------------------------//
      connector.cosignatureAdded(address).subscribe(async cosignatureAdded => {
        console.log("\n\n-----------------------COSIGNATURE_ADDED--------------------------")
        console.log(cosignatureAdded)
        console.log("------------------------------------------------------------------\n\n")
        this.setTransactionStatus({
          'type': 'cosignatureAdded',
          'hash': cosignatureAdded.parentHash
        });

        /*const aggregateBondedCache = await this.transactionsService.getAggregateBondedTransactions$().pipe(first()).toPromise();
        console.log('aggregateBondedCache --> ', aggregateBondedCache);
        if (aggregateBondedCache && aggregateBondedCache.length > 0) {
          const transactionFiltered = aggregateBondedCache.find(d => d.data.transactionInfo.hash === cosignatureAdded.parentHash);
          console.log('filtered', transactionFiltered);
        }*/

        /*if (filtered && filtered.data && filtered.data.cosignatures.length > 0) {
          const d = filtered.data.cosignatures.find(x => x.signature === cosignatureAdded.signature);
          if (!d) {
            console.log('filtered', d);
            const otherTransactions = aggregateBondedCache.filter(d => d.data.transactionInfo.hash !== cosignatureAdded.parentHash);
            filtered.data.cosignatures.push(cosignatureAdded.signature);
            otherTransactions.push(filtered);
            console.log('LO QUE VOY AGREGAR --> ', otherTransactions);
            this.transactionsService.setTransactionsAggregateBonded$(otherTransactions);
          }
        }*/
      });
    //});
  }

  /**
   *
   *
   * @param {Listener} connector
   * @param {HTMLAudioElement} audio
   * @memberof DataBridgeService
   */
  getConfirmedSocket(connector: Listener, audio: HTMLAudioElement, address: Address) {
    /*const currentWallet = Object.assign({}, this.walletService.getCurrentWallet());
    currentWallet.accounts.forEach(element => {*/
    console.log('address', address);

    // ----------------------------------CONFIRMED--------------------------------------------//
    connector.confirmed(address).subscribe(async confirmedTransaction => {
      console.log("\n\n -----------------------CONFIRMED---------------------------------")
      console.log(confirmedTransaction.transactionInfo.hash)
      console.log("------------------------------------------------------------------ \n\n")
      this.setTransactionStatus({
        'type': 'confirmed',
        'hash': confirmedTransaction.transactionInfo.hash
      });

      const confirmedCache = await this.transactionsService.getConfirmedTransactions$().pipe(first()).toPromise();
      const transactionPushed = confirmedCache.slice(0);
      const transactionFormatter = this.transactionsService.getStructureDashboard(confirmedTransaction, transactionPushed);
      if (transactionFormatter !== null) {
        audio.play();
        this.sharedService.showInfo('', 'Transaction confirmed');
        transactionPushed.unshift(transactionFormatter);
        this.transactionsService.setTransactionsConfirmed$(transactionPushed);
        this.transactionsService.searchAccountsInfo(this.walletService.currentWallet.accounts);
        this.namespaces.searchNamespacesFromAccounts([this.proximaxProvider.createFromRawAddress(this.walletService.getCurrentAccount().address)]);
      }
    });
    //});
  }

  /**
   *
   *
   * @param {Listener} connector
   * @param {HTMLAudioElement} audio
   * @memberof DataBridgeService
   */
  getStatusSocket(connector: Listener, audio: HTMLAudioElement, address: Address) {
    /*const currentWallet = Object.assign({}, this.walletService.getCurrentWallet());
    currentWallet.accounts.forEach(element => {*/
      // ----------------------------------STATUS--------------------------------------------//
      connector.status(address).subscribe(status => {
        console.log("\n\n-----------------------STATUS--------------------------")
        console.log(status.hash)
        console.log("------------------------------------------------------------------\n\n")
        this.sharedService.showWarning('', status.status.split('_').join(' '));
        this.setTransactionStatus({
          'type': 'status',
          'hash': status.hash
        });
      });
    //});
  }

  /**
   *
   *
   * @param {Listener} connector
   * @param {HTMLAudioElement} audio
   * @memberof DataBridgeService
   */
  getUnConfirmedAddedSocket(connector: Listener, audio: HTMLAudioElement, address: Address) {
    /*const currentWallet = Object.assign({}, this.walletService.getCurrentWallet());
    currentWallet.accounts.forEach(element => {*/
      // ----------------------------------UNCONFIRMED_ADDED--------------------------------------------//
      connector.unconfirmedAdded(address).subscribe(async unconfirmedAdded => {
        console.log("\n\n-----------------------UNCONFIRMED_ADDED--------------------------");
        console.log(unconfirmedAdded.transactionInfo.hash)
        console.log("------------------------------------------------------------------\n\n");
        this.setTransactionStatus({
          'type': 'unconfirmed',
          'hash': unconfirmedAdded.transactionInfo.hash
        });

        const unconfirmedCache = await this.transactionsService.getUnconfirmedTransactions$().pipe(first()).toPromise();
        const transactionPushed = unconfirmedCache.slice(0);
        const transactionFormatter = this.transactionsService.getStructureDashboard(unconfirmedAdded, transactionPushed);
        if (transactionFormatter !== null) {
          audio.play();
          this.sharedService.showInfo('', 'Transaction unconfirmed');
          transactionPushed.unshift(transactionFormatter);
          this.transactionsService.setTransactionsUnConfirmed$(transactionPushed);
        }
      });
   // });
  }

  /**
   *
   *
   * @param {Listener} connector
   * @param {HTMLAudioElement} audio
   * @memberof DataBridgeService
   */
  getUnConfirmedRemovedSocket(connector: Listener, audio: HTMLAudioElement, address: Address) {
    /*const currentWallet = Object.assign({}, this.walletService.getCurrentWallet());
    address: Addressnt => {*/
      // ----------------------------------UNCONFIRMED_REMOVED--------------------------------------------//
      connector.unconfirmedRemoved(address).subscribe(async unconfirmedRemoved => {
        console.log("\n\n-----------------------UNCONFIRMED_REMOVED--------------------------")
        console.log(unconfirmedRemoved)
        console.log("------------------------------------------------------------------\n\n")
        this.setTransactionStatus({
          'type': 'removedTransaction',
          'hash': unconfirmedRemoved
        });

        const unconfirmedCache = await this.transactionsService.getUnconfirmedTransactions$().pipe(first()).toPromise();
        if (unconfirmedCache && unconfirmedCache.length > 0) {
          const unconfirmedFiltered = unconfirmedCache.filter(next => next.data.transactionInfo.hash !== unconfirmedRemoved);
          this.transactionsService.setTransactionsUnConfirmed$(unconfirmedFiltered);
        }
      });
    // });
  }




  /**
   *
   *
   * @returns {Observable<TransactionStatus>}
   * @memberof DataBridgeService
   */
  getTransactionStatus(): Observable<TransactionStatus> {
    return this.transaction$;
  }


  /**
   * Reconnect
   *
   * @param {Listener} connector
   * @returns
   * @memberof DataBridgeService
   */
  reconnect() {
    if (this.connector) {
      console.log("Destruye conexion con el websocket");
      this.connector.forEach(element => {
        element.close();
        element.terminate();
      });
    }

    this.connectnWs();
    return;
  }

  /**
   * Allow to load the component in the routing
   *
   * @param {*} params
   * @memberof DataBridgeService
   */
  setblock(params: any) {
    this.block = params;
    this.blockSubject.next(this.block);
  }

  /**
  * Set a BlockInfo for a given block height
  *
  * @param {BlockInfo} params
  * @memberof DataBridgeService
  */
  setblockInfo(params: BlockInfo) { //Update-sdk-dragon
    this.blockInfo = params;
    this.transactionsService.generationHash = this.blockInfo.generationHash;
    this.namespaces.generationHash = this.blockInfo.generationHash;
    this.blockInfoSubject.next(this.blockInfo)
  }

  /**
   *
   *
   * @param {*} value
   * @returns
   * @memberof DataBridgeService
   */
  setTransactionStatus(value: any) {
    return this.transactionSubject.next(value);
  }
}
