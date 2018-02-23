/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework.
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata
});

// Listen for messages from users
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot.
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector);
bot.set('storage', tableStorage);

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisAPIKey+'&staging=true&verbose=true&timezoneOffset=330&q=';
//const LuisModelUrl ='https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/f94c6226-1925-451f-a65e-b68e15bcaa4e?subscription-key=8aa477f0bcb649fb8963a812e1fe0057&staging=true&verbose=true&timezoneOffset=330&q=';
// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var inMemoryStorage = new builder.MemoryBotStorage();
 
var LoanTypes = ['About Personal Loan','About Home Loan','About Business Loan'];
var HomeLoan=['Land Purchase Loan', 
'Home Purchase Loan',
'Home Construction Loan',
'Home Conversion Loan',
'Home Improvement Loan'
];
var intents = new builder.IntentDialog({ recognizers: [recognizer] })
 .matches('Greeting', (session) => {
        var card = createAnimationCard(session);
        var msg = new builder.Message(session).addAttachment(card);
        session.send(msg);
        session.beginDialog('displayIncidentMenu');
        
 })
  .matches('PersonalLoan', (session) => {

     session.send('I could help you with Personal Loan. \n\n'+' Please click any of the options given below or ask me something related to Loany offerings...');
     session.userData.LoanType='Personal Loan';
     session.beginDialog('displayHowItWorks');
 })
 .matches('HomeLoan', (session) => {

     session.send('I could help you with Home Loan. \n\n'+' Please click any of the options given below or ask me something related to Loany offerings...');
     session.userData.LoanType='Home Loan';
     session.beginDialog('displayHowItWorks');
   
 })
 .matches('BusinessLoan', (session) => {

     session.send('I could help you with Business Loan. \n\n'+' Please click any of the options given below or ask me something related to Loany offerings...');
     session.userData.LoanType='Business Loan';
     session.beginDialog('displayHowItWorks');
   
 })
 .matches('SatisfactoryIntent', (session) => {
console.log('satisfactoryintent');
//session.userData.LoanType='Bye';
   //  session.beginDialog('displayHowItWorks'); 
     var card = createSatisfactoryAnimationCard(session);
        var msg = new builder.Message(session).addAttachment(card);
        session.send(msg);
   
 })
 .onDefault((session) => {
     console.log('default');
     session.send('Sorry, Unable to resolve your query \'%s\'.', session.message.text);
     session.beginDialog('displayIncidentMenu');
 });

  bot.dialog('displayIncidentMenu',[
     function (session) {
     //    builder.Prompts.choice(session, 'LOANY- A Loan Processing Bot',LoanTypes ,{ listStyle: 3 });
     session.sendTyping();
          builder.Prompts.choice(session, 'I can help you with the followings', LoanTypes, {
            maxRetries: 3, listStyle: 3
             
        });
        session.endDialog();
     },
     function (session, results) {
       //  session.endDialog();
         session.beginDialog('/');
     }
 ]).triggerAction({
});

 bot.dialog('displayHowItWorks',[
     function (session) {
         builder.Prompts.choice(session, session.userData.LoanType,['How It Works','Docs Required'] ,{ listStyle: 3 });
     },
     function(session, results,next){
         
         if(results.response.entity==='How It Works')
         {
             if(session.userData.LoanType==='Personal Loan')
             {
                builder.Prompts.choice(session, session.userData.LoanType,['Salaried Employee Loans','Self Employed PROFESSIONAL Loans','Self Employed OWNER Loans'] ,{ listStyle: 3 });
                
             }
             else
              if(session.userData.LoanType==='Home Loan')
             {
                var msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.carousel)
                msg.attachments(CarousalCards(session));
                session.send(msg);
                
                 builder.Prompts.choice(session, 'I can help you with the followings', LoanTypes, {
            maxRetries: 3, listStyle: 3,
            retryPrompt: 'Ooops, what you wrote is not a valid option, please try again'
        });
             }
          else   if(session.userData.LoanType==='Business Loan')
             {
                 console.log('BL');
                var msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.carousel)
                msg.attachments(CarousalBusinessCards(session));
                session.send(msg);
               
                  builder.Prompts.choice(session, 'I can help you with the followings', LoanTypes, {
            maxRetries: 3, listStyle: 3,
            retryPrompt: 'Ooops, what you wrote is not a valid option, please try again'
        });
             }
         }
         else
         if(results.response.entity==='Docs Required')
         {
              session.send('For loan we would need your KYC documents, your Salary or Income proof and your Bank Statements');
              builder.Prompts.choice(session, 'I can also help you with the followings', LoanTypes, {
            maxRetries: 3, listStyle: 3,
            retryPrompt: 'Ooops, what you wrote is not a valid option, please try again'
        });
         }
         
     },
     
     function(session, results,next){
       
         if(results.response.entity==='Salaried Employee Loans')
         {
            var txtData='Suitable for bridging your short term cash flow gaps \n\n'+'Loans from Rs. 50,000 to Rs. 50 lakhs \n\n '+'Term from 12 months to 60 months \n\n'+'Average rates of 14-18% \n\n ';
            var imgLink='https://blog.bankbazaar.com/wp-content/uploads/2012/03/letter-2.jpg';
            var buttonLink='https://www.fundstiger.com/personal-loan/';
            var card = createThumbnailCard(session,results.response.entity,results.response.entity,txtData,imgLink,buttonLink,'Apply');
            var msg = new builder.Message(session).addAttachment(card);
            session.send(msg);
          //   session.send('Suitable for bridging your short term cash flow gaps \n\n'+'Loans from Rs. 50,000 to Rs. 50 lakhs \n\n '+'Term from 12 months to 60 months \n\n'+'Average rates of 14-18% \n\n ');

         }
         else if(results.response.entity==='Self Employed PROFESSIONAL Loans')
         {
              var txtData='Suitable for bridging your short term cash flow gaps \n\n'+'Loans from Rs. 50,000 to Rs. 50 lakhs \n\n '+'Term from 12 months to 60 months \n\n'+'Average rates of 14-18% \n\n ';
            var imgLink='https://blog.bankbazaar.com/wp-content/uploads/2012/03/letter-2.jpg';
            var buttonLink='https://www.fundstiger.com/personal-loan/';
            var card = createThumbnailCard(session,results.response.entity,results.response.entity,txtData,imgLink,buttonLink,'Apply');
            var msg = new builder.Message(session).addAttachment(card);
            session.send(msg);
         }
          else if(results.response.entity==='Self Employed OWNER Loans')
         {
            var txtData='Suitable for bridging your short term cash flow gaps \n\n'+'Loans from Rs. 50,000 to Rs. 50 lakhs \n\n '+'Term from 12 months to 60 months \n\n'+'Average rates of 14-18% \n\n ';
            var imgLink='https://blog.bankbazaar.com/wp-content/uploads/2012/03/letter-2.jpg';
            var buttonLink='https://www.fundstiger.com/personal-loan/';
            var card = createThumbnailCard(session,results.response.entity,results.response.entity,txtData,imgLink,buttonLink,'Apply');
            var msg = new builder.Message(session).addAttachment(card);
            session.send(msg);
         }

         session.beginDialog('displayIncidentMenu');
     },

     function (session, results) {

         session.endDialog();
         session.beginDialog('/')
     }
 ]).triggerAction({
      matches: /^SatisfactoryIntent /i,
    confirmPrompt: "This will cancel your request. Are you sure?"
});


bot.dialog('richMessagesDialog', [
    function (session) {
       
        builder.Prompts.choice(session, 'What card would like to test?', CardNames, {
            maxRetries: 3,
            retryPrompt: 'Ooops, what you wrote is not a valid option, please try again'
        });
    },
    function (session, results) {

        // create the card based on selection
        var selectedCardName = results.response.entity;
        var card = createCard(selectedCardName, session);

        // attach the card to the reply message
        var msg = new builder.Message(session).addAttachment(card);
        session.send(msg);
    }
]);




function createHeroCard(session) {
    return new builder.HeroCard(session)
        .title('BotFramework Hero Card')
        .subtitle('Your bots — wherever your users are talking')
        .text('Build and connect intelligent bots to interact with your users naturally wherever they are, from text/sms to Skype, Slack, Office 365 mail and other popular services.')
        .images([
            builder.CardImage.create(session, 'https://sec.ch9.ms/ch9/7ff5/e07cfef0-aa3b-40bb-9baa-7c9ef8ff7ff5/buildreactionbotframework_960.jpg')
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://docs.microsoft.com/bot-framework', 'Get Started')
        ]);
}

function createThumbnailCard(session,title,subtitle,text,imageLink,buttonLink,buttonName) {
    return new builder.ThumbnailCard(session)
        .title(title)
        .subtitle(subtitle)
        .text(text)
        .images([
            builder.CardImage.create(session, imageLink)
        ])
        .buttons([
            builder.CardAction.openUrl(session, buttonLink, buttonName)
        ]);
}

var order = 1234;
function createReceiptCard(session) {
    return new builder.ReceiptCard(session)
        .title('John Doe')
        .facts([
            builder.Fact.create(session, order++, 'Order Number'),
            builder.Fact.create(session, 'VISA 5555-****', 'Payment Method')
        ])
        .items([
            builder.ReceiptItem.create(session, '$ 38.45', 'Data Transfer')
                .quantity(368)
                .image(builder.CardImage.create(session, 'https://github.com/amido/azure-vector-icons/raw/master/renders/traffic-manager.png')),
            builder.ReceiptItem.create(session, '$ 45.00', 'App Service')
                .quantity(720)
                .image(builder.CardImage.create(session, 'https://github.com/amido/azure-vector-icons/raw/master/renders/cloud-service.png'))
        ])
        .tax('$ 7.50')
        .total('$ 90.95')
        .buttons([
            builder.CardAction.openUrl(session, 'https://azure.microsoft.com/en-us/pricing/', 'More Information')
                .image('https://raw.githubusercontent.com/amido/azure-vector-icons/master/renders/microsoft-azure.png')
        ]);
}

function createSigninCard(session) {
    return new builder.SigninCard(session)
        .text('BotFramework Sign-in Card')
        .button('Sign-in', 'https://login.microsoftonline.com');
}

function createAnimationCard(session) {
    return new builder.AnimationCard(session)
        .title('LOANY')
        .subtitle('Loan Application Bot')
        .image(builder.CardImage.create(session, 'https://docs.microsoft.com/en-us/bot-framework/media/how-it-works/architecture-resize.png'))
        .media([
            { url: 'https://blog.bankbazaar.com/wp-content/uploads/2017/02/Effective-Ways-To-Reduce-The-Interest-Cost-On-Your-Home-Loan.gif' }
        ]);
}
function createSatisfactoryAnimationCard(session) {
    return new builder.AnimationCard(session)
        .title('LOANY')
        .subtitle('Thanks for using Loany')
        .image(builder.CardImage.create(session, 'https://docs.microsoft.com/en-us/bot-framework/media/how-it-works/architecture-resize.png'))
        .media([
            { url: 'https://blog.bankbazaar.com/wp-content/uploads/2016/04/How-to-Transfer-a-Car-Loan-to-Another-Person-VM.gif' }
        ]);
}
function createVideoCard(session) {
    return new builder.VideoCard(session)
        .title('Big Buck Bunny')
        .subtitle('by the Blender Institute')
        .text('Big Buck Bunny (code-named Peach) is a short computer-animated comedy film by the Blender Institute, part of the Blender Foundation. Like the foundation\'s previous film Elephants Dream, the film was made using Blender, a free software application for animation made by the same foundation. It was released as an open-source film under Creative Commons License Attribution 3.0.')
        .image(builder.CardImage.create(session, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/220px-Big_buck_bunny_poster_big.jpg'))
        .media([
            { url: 'http://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4' }
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://peach.blender.org/', 'Learn More')
        ]);
}

function createAudioCard(session) {
    return new builder.AudioCard(session)
        .title('I am your father')
        .subtitle('Star Wars: Episode V - The Empire Strikes Back')
        .text('The Empire Strikes Back (also known as Star Wars: Episode V – The Empire Strikes Back) is a 1980 American epic space opera film directed by Irvin Kershner. Leigh Brackett and Lawrence Kasdan wrote the screenplay, with George Lucas writing the film\'s story and serving as executive producer. The second installment in the original Star Wars trilogy, it was produced by Gary Kurtz for Lucasfilm Ltd. and stars Mark Hamill, Harrison Ford, Carrie Fisher, Billy Dee Williams, Anthony Daniels, David Prowse, Kenny Baker, Peter Mayhew and Frank Oz.')
        .image(builder.CardImage.create(session, 'https://upload.wikimedia.org/wikipedia/en/3/3c/SW_-_Empire_Strikes_Back.jpg'))
        .media([
            { url: 'http://www.wavlist.com/movies/004/father.wav' }
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://en.wikipedia.org/wiki/The_Empire_Strikes_Back', 'Read More')
        ]);
}




function CarousalCards (session) {
    //var msg = new builder.Message(session);
    //msg.attachmentLayout(builder.AttachmentLayout.carousel)
    return ([
          new builder.ThumbnailCard(session)
        .title("Land Purchase Loan")
            .subtitle("Land Purchase Loan")
            .text(" You can take a land purchase loan for the purchase of a plot through direct allotment or a resale plot.")
            .images([builder.CardImage.create(session, 'https://www.goodreturns.in/img/2015/03/12-1426142991-land-home.jpg')])
            .buttons([
              //  builder.CardAction.imBack(session, "Land Purchase Loan", "Apply")
              builder.CardAction.openUrl(session, 'https://www.fundstiger.com/home-loan/', 'Apply')
            ]),
         
        new builder.ThumbnailCard(session)
            .title("Home Purchase Loan")
            .subtitle("Home Purchase Loan")
            .text("If you are buying an existing property, or a stand-alone home, a home purchase loan is your best bet.")
            .images([builder.CardImage.create(session, 'https://blog.fundsindia.com/blog/wp-content/uploads/2014/07/137535921832-Loan_hut.jpg')])
            .buttons([
                builder.CardAction.openUrl(session, 'https://www.fundstiger.com/home-loan/', 'Apply')
            ]),
        new builder.ThumbnailCard(session)
            .title("Home Construction Loan")
            .subtitle("Home Construction Loan")
            .text("If you already own a plot where you would like to construct a home to your liking, then you can consider taking a home")
            .images([builder.CardImage.create(session, 'http://www.loanofferszone.com/wp-content/uploads/2017/06/57cc5fbf9ec6682fac87417e.jpg')])
            .buttons([
                builder.CardAction.openUrl(session, 'https://www.fundstiger.com/home-loan/', 'Apply')
            ]),
        new builder.ThumbnailCard(session)
            .title("Home Conversion Loan")
            .subtitle("Home Conversion Loan")
            .text("If you already have a Home Loan but wish to purchase and move into a new house, this loan would work best for you")
            .images([builder.CardImage.create(session, 'https://i.ytimg.com/vi/4nFoF9J_qEg/maxresdefault.jpg')])
            .buttons([
                builder.CardAction.openUrl(session, 'https://www.fundstiger.com/home-loan/', 'Apply')
            ]),
        new builder.ThumbnailCard(session)
            .title("Home Improvement Loan")
            .subtitle("Home Improvement Loan")
            .text("If you already own a home but lack the funds to renovate your home, a home improvement loan can help")
            .images([builder.CardImage.create(session, 'https://www.commonfloor.com/articles/wp-content/uploads/2011/03/230307.jpg')])
            .buttons([
                builder.CardAction.openUrl(session, 'https://www.fundstiger.com/home-loan/', 'Apply')
            ])
    ]);
  }

function CarousalBusinessCards (session) {
    //var msg = new builder.Message(session);
    //msg.attachmentLayout(builder.AttachmentLayout.carousel)
    return ([
            new builder.VideoCard(session)
        .title('Working Capital Loan')
        .subtitle('Working Capital Loan')
        .text('Loans from Rs. 50,000 to Rs. 10 Cr.Term from 3 months to 12 monthsRates as charged by partner lending Banks and NBFCs.NBFC can finance up to 90% of the invoices.Fast disbursement ')
        .image(builder.CardImage.create(session, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/220px-Big_buck_bunny_poster_big.jpg'))
        .media([
            { url: 'https://www.youtube.com/watch?v=naf0Cwuw1lE' }
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://www.fundstiger.com/business-loan/', 'Apply')
        ]),
         
          new builder.VideoCard(session)
        .title('Short Term Loans')
        .subtitle('Short Term Loans')
        .text('Loans from Rs. 50,000 to Rs. 10 Cr.Term from 3 months to 12 months.Ideal for businesses that are over 1 year old.Fast disbursement.')
        .image(builder.CardImage.create(session, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/220px-Big_buck_bunny_poster_big.jpg'))
        .media([
            { url: 'https://www.youtube.com/watch?v=iJRSvecMpFU' }
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://www.fundstiger.com/business-loan/', 'Apply')
        ]),
       
         new builder.VideoCard(session)
        .title('Medium Term Loans')
        .subtitle('Medium Term Loans')
        .text('Loans from Rs. 50,000 to Rs. 10 Cr.Term from 1 year to 3 years.Ideal for businesses that are over 2 years old.Fast disbursement.')
        .image(builder.CardImage.create(session, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/220px-Big_buck_bunny_poster_big.jpg'))
        .media([
            { url: 'https://www.youtube.com/watch?v=DXNlwGxNJb4' }
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://www.fundstiger.com/business-loan/', 'Apply')
        ])
      ]);
  }


  bot.dialog('/', intents);
