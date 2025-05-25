$(function(){
    (async function() {

        // fetch currency list
        let currencies = await fetchCurrencies();

        //local storage
        let storage = window.localStorage;

        //delete portfolio from listing
        if($("#portfolio-listing").length){
            $(".delete-portfolio").on("click", async function () {
                if (confirm('Are you sure you want to delete this portfolio?')) {
                   let id = $(this).data('id');
                    await fetch('/portfolios/'+id, {
                        method: 'DELETE',
                    });
                    location.reload();
                }
            })
        }

        if($("#portfolio-page").length){
            let table = $("#portfolio-table");
            //generate portfolio total
            if(table.length){
                let total = 0.0;
                table.find('.crow').each(function (i) {
                    let nameCol = $(this).find('.currency-name');
                    let valueCol = $(this).find('.currency-value .money');
                    let priceCol = $(this).find('.currency-price .money');
                    let amount = $(this).find('.currency-amount').text();
                    let currency = currencies.find(o => o._id === nameCol.data('id'));
                    nameCol.text(currency.name);
                    priceCol.data('value',currency.price)
                    priceCol.text(formatMoney(currency.price));

                    let value = parseFloat((currency.price * amount).toFixed(2));
                    total = total + value;

                    valueCol.data('value',value);
                    valueCol.text(formatMoney(value));
                })

                $(".total").data('value', total)
                $(".total").text(formatMoney(total));

                //send total to server
                await putRequest('',{
                    total: total,
                    action: 'update'
                });
            }

            //edit portfolio name/desc
            $(".edit-portfolio").on("click", function () {
                $("#createPortfolioModalLabel").text("Edit Portfolio");

                let form = $("#create-portfolio-form");
                form.attr('action', '?_method=PUT');
                form.append('<input type="hidden" name="_method" value="PUT">');
                form.append('<input type="hidden" name="action" value="edit">');
                let portfolioNameField = $("#portfolio-name");
                let portfolioDescField = $("#portfolio-desc");

                portfolioNameField.val($("#portfolio").text());
                portfolioDescField.text($("#portfolio").text());
                $('#createPortfolioModal').modal('show');
            });

            //edit currency
            $(".edit-currency").on("click", function () {
                let row = $(this).parent().parent();
                let name = row.find('.currency-name').text();
                let amount = row.find('.currency-amount').text();
                $( "#currency-name" ).val(name);
                $( "#amount" ).val(amount);
                $('#addCryptoModal').modal('show');
            });

            //delete currency
            $(".delete-currency").on("click", async function () {
                if (confirm('Are you sure you want to remove this currency?')) {
                    let row = $(this).parent().parent();
                    let currencyId = row.find('.currency-name').data('id');
                    let currencyName = row.find('.currency-name').text();
                    let amount = row.find('.currency-amount').text();
                    await putRequest('',{
                        id:currencyId,
                        name: currencyName,
                        amount: amount,
                        action: 'remove'
                    });
                    location.reload();
                }
            });

            //reset modal values
            $('#addCryptoModal').on('hidden.bs.modal', function (e) {
                $( "#currency-name" ).val("");
                $( "#amount" ).val("");
            })

            /*
            * Autocomplete for adding currency
            * */
            let arr = currencies.map(elm => ({ id: elm._id, label: elm.name, price: elm.price}));
            $( "#currency-name" ).autocomplete({
                source: arr,
                focus: function( event, ui ) {
                    $( "#currency-name" ).val( `${ui.item.label } ($${ui.item.price})`);
                    return false;
                },
                select: function( event, ui ) {
                    $( "#currency-name" ).val(ui.item.label);
                    return false;
                }
            });
        }

        /*
        * Add colors to crypto currency percent change
        * Red for negative
        * Green for positive
        * */
        let percentChange = $('.change');
        if(percentChange.length){
            percentChange.each(function () {
                if($(this).text().includes('-')){
                    $(this).addClass('text-danger');
                } else {
                    $(this).addClass('text-success');
                }
            })
        }

        //supported country codes
        let countryCode;
        let countries = {
            "CA": "CAD",
            "AU": "AUD",
            "GB": "GBP",
            "EU": "EUR",
            "US": "USD"
        };

        //fetch country code of user
        try {
            await fetch("http://ip-api.com/json/").then(response => response.json()).then(data => {
                countryCode = data.countryCode;
            });
        } catch (error) {
            countryCode = "CA";
        }

        //setup country flags
        let flags = $("#flagstrap");
        let chosenCurrency = Cookies.get('currency');
        if(!chosenCurrency){
            chosenCurrency = countries[countryCode];
            flags.data('selected-country', countryCode);
        }
        flags.flagStrap({
            countries: countries,
            buttonSize: "btn-sm",
            buttonType: "btn-primary",
            scrollable: false,
            scrollableHeight: "350px"
        });

        // save selected country code to cookies
        flags.find('select').change(function() {
            let selected = $(this).children("option:selected");
            Cookies.set('currency', selected.text());
            Cookies.set('country', selected.val());
            location.reload();
        });


        //fetch exchange rates
        let data = storage.getItem('exchange-rates');
        let dataExpiry = storage.getItem('exchange-rates-expiry');
        let now = new Date().getTime();
        
        // Check if data exists and is not expired (1 hour cache)
        if(!data || !dataExpiry || now > parseInt(dataExpiry)){
            data = await fetch('/api/exchange-rates')
                .then(response => response.json());
            
            // Store in localStorage with expiry
            storage.setItem('exchange-rates', JSON.stringify(data));
            storage.setItem('exchange-rates-expiry', now + (2 * 60 * 60 * 1000)); // 2 hours
        } else {
            // Parse stored data
            data = JSON.parse(data);
        }

        if ( typeof fx !== "undefined" && fx.rates ) {
            fx.rates = data.rates;
            fx.base = data.base;
        } else {
            // If not, apply to fxSetup global:
            var fxSetup = {
                rates : data.rates,
                base : data.base
            }
        }

        let moneySpans = $('.money');
        if(moneySpans.length){
            moneySpans.each(function () {
                if(chosenCurrency !== "USD"){
                    let value = parseFloat($(this).data('value'));
                    let converted = fx.convert(value, {from: "USD", to: chosenCurrency});
                    if(value < 1)
                        converted = converted.toFixed(6);
                    else if (value > 1 && value < 100000)
                        converted = converted.toFixed(2);
                    else
                        converted = converted.toFixed(0);
                    $(this).text(formatMoney(converted,chosenCurrency));
                }
            })
        }
    })();
});

// format money with symbol and comma
function formatMoney(x,currency = 'USD') {
    return symbols[currency] + (new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 6
    }).format(x));
}

//send a put request to server
async function putRequest(url, data){
    return await fetch(url, {
        method: 'PUT',
        headers: {
            "Content-type": "application/json",
            "Accept": "application/json",
            "Accept-Charset": "utf-8"
        },
        body: JSON.stringify(data)
    });
}

// fetch currencies list
async function fetchCurrencies() {
    return await fetch('/api/currencies', {
        method: 'get',
        headers: {
            "Content-type": "application/json",
            "Accept": "application/json",
            "Accept-Charset": "utf-8"
        }
    }).then(response => response.json()).then(data => data.DATA);
}