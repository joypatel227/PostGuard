you analyse first full product if you don't know.

then you know what in our product or project.it is SAAS product which is our company first product.


**ROLES**
we have 5 roles in our product.
1. Lord (Shriyu Nexus tech Owner [me & partner & also our team])
2. Owner (Agency)
3. Admin (Who is manage all things from office and sit at office place)
4. supervisor (Who is visit some sites & take folloups from field's guards)
5. security (Who is on site for guard)

we have add a guard an entity
one time login in one device then store the credintials of that into localstorage which is accessible through our system
so when it is enter second time in our software then it have logined through stored creditianls

add a one thing when lord create a new owner then ask about agency name so it will properly managing

in lord panel also add a option for the new aganecy name then when enter a agency then add owner it will getting names of agencies are from that 

now security panel is not make bcz 95% guards have not smart device to manage it.
so supervisor add directly guards in his panel and manage all things from that and admin have also manage all things which is do supervisor 
means any entity can do or manage all things which are do from it's law level entities (excpet Lord bcz its on company level means it is sell product not a part of any agency.)


**Attendance**
attendance is only getting of admin, supervisor and security
- admin system is basically on office place so when its starts & shuting down then it count as attendance time and also manual option to do that from owner panel it will set that
- supervisor is present through image like which is show location at bottom of that and our system scan that and then it will notify to admin and owner request to attendance it is upload at our software and second option is manual which is also managed by owener's panel. and track all thigns from live location with live time so it will not cheat and also show in upper level both entity (admin and owner)
- Guard things managed through supervisor and also option like managed through image which can upload at softyware and at a bottom location is also show
    {
        =Supervisor add msg to whatsapp grp for attendance of security
            - if msg of all present/absent securities 
            
            format is like : [
                (present/absent)
                Site1:securit1,security3
                Site2:security2,security4 ...
                ]
    }
    from that also admin manage attendances of all securities so when this msg copy to paste on our software then also it will update attendance of all securities

**Payment**
payment is bassically getting through sites

full process: 
== now which is done without our product 
    1. send manually bill to site manager or secratory
    2. site will pay to account which is mention on bill
    3. getting ss from site to admin 
    4. update payment status in excel sheet (both at site and accounts)

== in our software:
    - open a payment panel
    - Showing all site with their amount with how much remain to pay
    1. Send a bill (manully from external file/ fix format generate through our software and send automatically to site panel and notify to site manager [at btn clicked / set as fix date of month (one time) ] )
     {GST / Normal bill is also set by admin/owner for sending to site [ formats : 
        1. GST ("D:\Shriyu\Aakash bhai\Normal_bill.pdf")
        2. Normal ("D:\Shriyu\Aakash bhai\GST_bill.pdf")
     ]}
    2. Site will pay to account which is also mention on bill and then it will getting reciept for downloading as pdf form (also getting format for that)
    3. for now put a SS on the site panel 
    4. Verify the SS and update payment status and in also account management.
    5. update all things which is connected to this things

**Salary**
== process in our software:
    1. open salary panel from admin panel
    2. Showing all security guards with their salary and attendance status
    3. Pay option to a each security so it will open and show how much you pay now like all or custom (which is set by owner/admin)
    4. after pay update like paid this amnt and also show in which date it is paid and also show in which mode it is paid (like online/offline) ... and also shwoing like which bank accout to which account paid 
    5. update all things which is connected to this things

**Security (Entity)**
- this entity rule is for creating acount is excpeting our main rule 
= creating account of security:
     from supervisor create a new security from it panel (asking of name, phone(mandatory otp verification), address, salary, site_name( with type Regular/Temporary))
= this panel create like you only frontend and layout which is like which thing is showing on home page or another are where these all things add from your side as yoy like 

= salary is fix for a month (which is set by admin/owner/supervisor) and it will deduct from salary of security and save history in security and admin/owner.
    it is count like that
    if salary is 10k then 10000/30 = 333.33 per day (taking month days eg.28,29,30,31 as a month)
    if security is onduty for 26 days then 26 * 333.33 = 8666.58
    if security is offduty for 4 days then 4 * 333.33 = 1333.32
    total = 8666.58 + 1333.32 = 10000
    and count only onduty salary (only that show in owner/admin panel to salary for that)




**Supervisor**
= login and register have happened in past

= on navbar show it is onduty/offduty
    - when is onduty or request to present to admin/owner then it will show on map and notify to admin/owner with longer

= so it is visit sides as a assigned through admin/owner:
    - supervisor is on panel and it will show all assigned sites then it will select any site to visit then on panel show the location of site from it location and then getting time to reach the site from map and also calculate how much actual time it will take to reach site then it will show on panel. its count a points for that and added to score of supervisor.if supervisor is late then score will be deducted.
    - now supervisor reach the site then it will update to 'reaching' status on panel then it will take all followusp of guards which is assigned to that site
    - then it will add to panel followups and any compain if.
    - after all process it will update to 'visited' status on panel
    then it will choose a next site then also same process done through the entire job for that day
    - one also add like when fuel a petrol at vehicle then also showing in map and count all things like that bt in that points are not adding but deducted from total points if it is late to reach petrolpump
    and petrol pump selection option is giving to supervisor bcz some times it will profitable
    - when it is fueling then amount is deducted by VW.
    - and also count the total distance covered by supervisor in a day and also show in map and create a graph per day like this place to this after this to this with time period

= followups and compains of site guards
    - like type things which is store and showing on panel of supervisor and admin/owner
    - in that if any security is urgency of money and if supervisor give the money to the security then it will show on panel of supervisor and admin/owner . and also we deduct to virtual wallet(which is basically exchange money btn supervisor - admin/owner)

**Admin/Owner**
"one only difference Owner add admin."
and we have 2 types of notify [1.imp(it gets both owner & admin) ,2.reguler(it gets only admin)]
= virtual wallet
    - showing a upper any side border like wallet symbol and amount of money in it
    - if admin/owner withdraw a money then it will add to wallet and plus it 
    - when it will give to any security then it will deduct from VW and also duduct amount from salary to security and save history in security and admin/owner.
    - when it will give to supervisor then it will add to VW and also add to supervisor wallet and save history in supervisor and admin/owner.
    - any supervisor give money to security then it will add to VW and also dudect salary of security and save history in security and supervisor.

= showing supervisor card on admin/owner panel
    - showing all supervisor with their status (onduty/offduty)
    - option to assign job for sites a day (like which site supervisor will visit today)
    - showing in small not all things and show all/symbol btn which is land to new page of supervisor (119 line)

= showing security card on admin/owner panel
    - showing all security with their status (onduty/offduty)
    - showing in small not all things and show all/symbol btn which is land to new page of supervisor (126 line)

= new page/section of supervisors
    - showing all list of with status
    - option of assign job for sites
    - showing live location and update with all things which is connected to that 
    - visible on map function 

= new page/section of security
    - showing all list of with status
    - show on site location if onduty with on map function 

= new page/section of map function (last order section)
    - basically showing security and supervisor roles of live locations which is onduty
    - supervisor's location from live location and security's location from site location
    - show sites like of typr symbol(color diff from open/close)
      and also show a number like '2' for security onduty on site
    - for supervisor also a diff symbol with and color also if it will visit on any site like now onsite to "A-place" reach and it is not reachout now then it will show with its symbol not a merg with number or something


= new page/section of sites
    - showing all list of sites with securities
    - showing site status (like open/close)
    - option of add site

= new page/section of payment
    - basically its for getting payment from different sites
    - showing list of sites with their payment status
    - option each side to send a GST/normal bill to site (show selected format)
    - in row show like this (site name, amount, remain to pay, account_name of owner , send bill btn , tripple vertical dots (for edit))
    - tripple vertical dots open a pop up with (edit, delete (take confirmation))
    - edit option open a pop up with (bill formation (by default normal) (normal/GST/manual(from external file)), set to send automatic with date (like 1st of every month), edit amount, edit remain to pay, edit send bill btn)
    - showing history of payment (in new section bt still in payment page/section)
    - showing on top total payment geting and total payment remain to pay and total of both at month level all of that (with their symbol)
    - update all things which is connected throgh this.

= new page/section of salary
    - basically its for paying salary to securities
    - showing list of securities with their salary status
    - in row show like this (security name, amount(onduty only), account_name of owner , pay salary btn (asking for pay all or custom amount), tripple vertical dots (for edit))
    - edit option open a pop up with (edit amount )
    - tripple vertical dots open a pop up with (edit, delete (take confirmation))
    - showing history of salary
    - showing on top total salary giving and total salary remain to pay and total of both at month level all of that (with their symbol)
    - update all things which is connected throgh this.


= new page/section of Analysis:
    - basically it showing all things of business growth.
    - at top showing total payment getting , paid salaries, withdrawal (like upad) , profit (total payment getting - paid salaries - withdrawal)
    - owner's all bank account showing in a card with list of accounts (row show : account_name, debited (salary+VW) , credited(payment from site) , total transations , account_balance , 3dots to edit all of things of them) at a month level
    - month/anual profit graph 
    - showing graph of payment and salary (like this month this much payment and this much salary)
    - showing graph of supervisor and security (like this much supervisor and this much security)
    - showing graph of sites (like this much sites and this much sites)

**Site**

= main page
- list of allocated securities
    - regular...
        - raw(security name , number , status)
    - temporary...
        - raw(security name , number , status)


    - If current payment in due then show on home page
    - If cl ear then show last payment paid date but not top of page or home page as appropriate you

    - Last visited supervisor drill like
        - Name ,followups, complaint etc as appropriate you 

    - As a new parameters is site name,site type (flat , bunglow, company)  , location , no. of securities