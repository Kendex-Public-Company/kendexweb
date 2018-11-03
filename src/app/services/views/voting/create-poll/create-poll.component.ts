import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormControl, FormArray, ValidatorFn } from "@angular/forms";

import { WalletService } from '../../../../shared/services/wallet.service';
import { NemProvider } from '../../../../shared/services/nem.provider';
import { SharedService } from '../../../../shared';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Address, UInt64, Account } from 'nem2-sdk';
@Component({
  selector: 'app-create-poll',
  templateUrl: './create-poll.component.html',
  styleUrls: ['./create-poll.component.scss']
})
export class CreatePollComponent implements OnInit {
  @BlockUI() blockUI: NgBlockUI;
  optionsStorage: Array<any>;
  account: Account;
  errorDate: string;
  validateform = false;
  createpollForm: FormGroup;
  keyObject = Object.keys;
  optionsData:any;
  options: Array<any>
  accountPrin: string = 'SBGFBK-22DHGH-JW5MD6-M6BJ43-Y26ABU-IQRKP5-WNXG';
  privateKey: string = '01E4B2794BD5EAC9A2A20C1F8380EF79EBB7F369A5A6040291DB3875867F4727';
  constructor(
    private fb: FormBuilder,
    private walletService: WalletService,
    private nemProvider: NemProvider,
    private sharedService: SharedService,


  ) {
    // this.indexAccount = this.nemProvider.generateNewAccount(this.walletService.network).address.plain();
    this.optionsStorage = [{ value: '', label: 'select ' }, { value: '1', label: 'POI ' }, { value: '2', label: 'white List ' }]
  }

  ngOnInit() {
    this.createForm();

  }


  createForm() {
    this.options = [{ value: 'YES' }, { value: 'NO' }]
    this.optionsData = this.options.map((value, index) => new FormControl(value.value, Validators.required))
    this.createpollForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      indexAccount: [{ value: this.accountPrin, disabled: true }, [Validators.required, Validators.maxLength(30)]],
      datepoll: ['', Validators.required],
      choice: [''],
      type: [{ value: '1', disabled: false }, Validators.required],
      options: new FormArray(this.optionsData),
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(30)]],
    });
    this.createpollForm.get('datepoll').valueChanges.subscribe(
      doe => {
        if (new Date(doe).getTime() <= Date.now()) {
          this.errorDate = "fecha no valida "
          this.validateform = true;
        } else {
          this.errorDate = ""
          this.validateform = false;
        }
      }); 
  }

  addoptions(add?:boolean,remove?:boolean){
    const control = <FormArray>this.createpollForm.controls['options'];
    if (add){
      control.push(new FormControl('', Validators.required) )
    }else{
      const b =this.createpollForm.value.options.pop();
      control.removeAt( this.createpollForm.value.options.indexOf(b))
    }
  }
  removeOptions(index){
    const control = <FormArray>this.createpollForm.controls['options'];
    control.removeAt(index)

  }
  getError(param, formControl?) {
    if (this.createpollForm.get(param).getError('required')) {
      return `This field is required`;
    } else if (this.createpollForm.get(param).getError('minlength')) {
      return `This field must contain minimum ${this.createpollForm.get(param).getError('minlength').requiredLength} characters`;
    } else if (this.createpollForm.get(param).getError('maxlength')) {
      return `This field must contain maximum ${this.createpollForm.get(param).getError('maxlength').requiredLength} characters`;
    }
  }

  /**
  *Get form errors
  *
  * @param {*} param
  * @param {*} name
  * @returns
  * @memberof LoginComponent
  */
  getErrorGroup(param, name) {
    if (this.createpollForm.get(param).get(name).getError('required')) {
      return `This field is required`;
    } else if (this.createpollForm.get(param).get(name).getError('minlength')) {
      return `This field must contain minimum ${this.createpollForm.get(param).get(name).getError('minlength').requiredLength} characters`;
    } else if (this.createpollForm.get(param).get(name).getError('maxlength')) {
      return `This field must contain maximum ${this.createpollForm.get(param).get(name).getError('maxlength').requiredLength} characters`;
    }
  }

  create() {
    this.createpollForm.valid
    // //  && this.validateform
    console.log(this.createpollForm.value.options)

    console.log()




    if (this.createpollForm.valid && !this.validateform) {

      const common = {
        password: this.createpollForm.get('password').value
      }
      if (this.walletService.decrypt(common)) {




        this.preparepoll(common)
      }
    }
  }
  preparepoll(common) {
    const strings = []
    const stringsPubliKey = []
    let obj: any = {}
    let Link = []

    const doe = new Date(this.createpollForm.get('datepoll').value).getTime()

    // console.log("dormoati de fecha",doe );
    let optionsForm = this.createpollForm.get('options').value
    this.keyObject(this.createpollForm.get('options').value).forEach(element => {
      strings.push(optionsForm[element])

      let accountPoll: Account;
      accountPoll = this.nemProvider.generateNewAccount(this.walletService.network)
      stringsPubliKey.push(accountPoll.publicKey)
      obj[optionsForm[element]] = accountPoll.address.plain();
    })

    const OptionsRoot: OptionsRoot = {
      options: {
        strings: strings,
        link: obj,
        stringsPubliKey: stringsPubliKey
      }
    }

    const FormDataRoot: FormDataRoot = {
      formData: {
        title: this.createpollForm.get('title').value,
        doe: doe,
        type: this.createpollForm.get('type').value,
        multiple: this.createpollForm.get('choice').value,

      }
    }
    //1540695600000

    let DescriptionRoot: DescriptionRoot = {
      description: {
        description: this.createpollForm.get('description').value
      }

    }
    let datapoll: Datapoll = {
      options: OptionsRoot,
      description: DescriptionRoot,
      formData: FormDataRoot
    }

    let accountPoll: Account;
    accountPoll = this.nemProvider.generateNewAccount(this.walletService.network)
    console.log(this.nemProvider.generateNewAccount(this.walletService.network).privateKey)
    // this..sendaccountPoll(element, datapoll, accountPoll,common);
    Object.keys(datapoll).forEach(element => {
      this.sendaccountPoll(datapoll[element], accountPoll.address.plain(), common.privateKey);
    });
    // const orderedAddresses = Object.keys(addressLink).map((option) => addressLink[option]);

    const PollRoot: PollRoot = {
      poll: {
        title: this.createpollForm.get('title').value,
        doe: doe,
        type: this.createpollForm.get('type').value,
        address: accountPoll.address.plain(),
        publicKey: accountPoll.publicKey
      }
    }
    const privateKey = {
      password: this.createpollForm.get('password').value
    }
    this.sendaccountPoll(PollRoot, this.accountPrin, this.privateKey);
  }
  sendaccountPoll(mensaje: any, address, privateKey) {
    this.blockUI.start('Loading...'); // Start blocking
    let transferTransaction: any
    transferTransaction = this.nemProvider.sendTransaction(this.walletService.network, address, JSON.stringify(mensaje))
    transferTransaction.fee = UInt64.fromUint(0);

    const account = Account.createFromPrivateKey(privateKey, this.walletService.network);

    console.log(JSON.stringify(account))
    const signedTransaction = account.sign(transferTransaction);
    this.nemProvider.announce(signedTransaction).subscribe(
      x => {
        this.blockUI.stop(); // Stop blocking
        console.log("exis=", x)
        this.createpollForm.reset();
        this.sharedService.showSuccess('success', 'poll created')
      },
      err => {
        this.sharedService.showError('Error', '¡unexpected error!');
        console.error(err)
      });
  }



}

interface PollRoot {
  poll: Poll;
}
interface Poll {
  title: string;
  type: number;
  doe: number;
  address: string;
  publicKey: string,
}



interface OptionsRoot {
  options: Options
}


interface Options {
  strings: string[];
  link: any;
  stringsPubliKey: any
}


interface DescriptionRoot {
  description: DescriptionRoot;
}

interface Description {
  description: string;
}



interface Datapoll {
  options?: OptionsRoot;
  description?: DescriptionRoot;
  formData?: FormDataRoot;
}

interface FormData {
  title: string;
  doe: number;
  type: string;
  multiple: string;
}

interface FormDataRoot {
  formData: FormData;

}
// interface Object {
//   value: string;
// }
