import { Component, OnInit, Input, SimpleChanges } from '@angular/core';
import { NamespacesService } from '../../../servicesModule/services/namespaces.service';
import { TransactionsService } from '../../../transactions/service/transactions.service';
import { TransactionsInterface } from '../../services/transaction.interface';
import { MosaicService } from '../../../servicesModule/services/mosaic.service';
import { MosaicsStorage } from 'src/app/servicesModule/interfaces/mosaics-namespaces.interface';
import { MosaicId } from 'tsjs-xpx-catapult-sdk';

@Component({
  selector: 'app-mosaic-definition-type',
  templateUrl: './mosaic-definition-type.component.html',
  styleUrls: ['./mosaic-definition-type.component.scss']
})
export class MosaicDefinitionTypeComponent implements OnInit {

  @Input() mosaicDefinition: TransactionsInterface;
  viewNamespaceId: boolean = false;
  mosaicId: MosaicId;

  constructor(
    private mosaicService: MosaicService,
    public transactionService: TransactionsService
  ) { }

  ngOnInit() {
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    console.log(this.mosaicDefinition);
    this.viewNamespaceId = false;
    this.mosaicDefinition['mosaicsStorage'] = null;
    this.mosaicId = this.mosaicDefinition.data['mosaicId'].toHex();
    const mosaics: MosaicsStorage[] = await this.mosaicService.searchMosaics([this.mosaicDefinition.data['mosaicId']]);
    console.log(mosaics);
    if (mosaics !== undefined && mosaics !== null) {
      if (mosaics.length > 0) {
        this.viewNamespaceId = false;
        this.mosaicDefinition['mosaicsStorage'] = mosaics[0];
      }
    }
  }

}
