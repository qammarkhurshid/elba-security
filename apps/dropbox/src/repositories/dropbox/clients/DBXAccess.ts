import { Dropbox, DropboxOptions } from 'dropbox';

export class DBXAccess extends Dropbox {
  private customOptions: DropboxOptions;

  constructor(options: DropboxOptions) {
    super(options);
    this.customOptions = options;
  }

  setHeaders(options: DropboxOptions) {
    Object.assign(this.customOptions, options);
    const updatedDropbox = new Dropbox(this.customOptions);

    // Assign the updated Dropbox instance back to this instance
    Object.assign(this, updatedDropbox);
  }
}
