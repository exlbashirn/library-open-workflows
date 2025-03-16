import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AlertModule, CloudAppTranslateModule, InitService, MaterialModule } from '@exlibris/exl-cloudapp-angular-lib';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ConfigurationComponent } from './configuration/configuration.component';
import { DeleteConfirmationDialogComponent } from './configuration/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { EditDialogComponent } from './configuration/edit-dialog/edit-dialog.component';
import { FormComponent } from './form/form.component';
import { MainComponent } from './main/main.component';
import { TopMenuComponent } from './top-menu/top-menu.component';

@NgModule({
    declarations: [
        AppComponent,
        MainComponent,
        FormComponent,
        TopMenuComponent,
        ConfigurationComponent,
        DeleteConfirmationDialogComponent,
        EditDialogComponent
    ],
    bootstrap: [AppComponent],
    imports: [
        MaterialModule,
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        AlertModule,
        FormsModule,
        ReactiveFormsModule,
        CloudAppTranslateModule.forRoot()
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            useFactory: () => () => { },
            deps: [InitService],
            multi: true
        },
        provideHttpClient(withInterceptorsFromDi()),
    ]
})
export class AppModule { }
