// Browser copy of field-labels.js (that file uses CommonJS module.exports for server.js).
// Keep both in sync when adding/renaming form fields.

const INCOME_ROWS = [
  ["employmentIncome", "Employment Income"],
  ["pensionAnnuities", "Pension/Annuities"],
  ["childSupport", "Child Support"],
  ["spousalSupport", "Spousal Support"],
  ["employmentInsurance", "Employment Insurance"],
  ["socialAssistance", "Social Assistance"],
  ["selfEmploymentIncome", "Self Employment Income"],
  ["rentalIncome", "Rental Income"],
  ["universalChildCare", "Universal Child Care"],
  ["childTaxBenefits", "Child Tax Benefits"],
  ["other", "Other (Specify)"],
];
const INCOME_COLUMNS = [
  ["applicant", "Applicant"],
  ["spouse", "Spouse"],
  ["otherHousehold", "Other Household"],
];

const INCOME_FIELD_LABELS = {};
INCOME_ROWS.forEach(([rowKey, rowLabel]) => {
  INCOME_COLUMNS.forEach(([colKey, colLabel]) => {
    INCOME_FIELD_LABELS[`${rowKey}_${colKey}`] = `${rowLabel} - ${colLabel}`;
  });
  if (rowKey === "other") {
    INCOME_COLUMNS.forEach(([colKey, colLabel]) => {
      INCOME_FIELD_LABELS[`other_${colKey}Description`] = `Other (Specify) - ${colLabel} Description`;
    });
  }
});
INCOME_COLUMNS.forEach(([colKey, colLabel]) => {
  INCOME_FIELD_LABELS[`subtotal_${colKey}`] = `Sub Total - ${colLabel}`;
});
INCOME_FIELD_LABELS.totalCombinedIncome = "Total Combined Income";

const EXPENSE_SECTIONS = [
  {
    key: "nonDiscretionary",
    title: "Monthly Non-Discretionary Expenses",
    subtotalLabel: "Total Combined Expenses",
    otherArrayName: "otherExpenses",
    rows: [
      ["childSupportPayments", "Child Support Payments"],
      ["spousalSupportPayments", "Spousal Support Payments"],
      ["childCare", "Child Care"],
      ["medicalConditionExpenses", "Medical Condition Expenses"],
      ["finesPenaltiesCourt", "Fines/Penalties Imposed by Court"],
      ["employmentConditionExpenses", "Expenses as a Condition of Employment"],
      ["debtsStayFiled", "Debts Where Stay Has Been Filed"],
      ["businessRelatedExpenses", "Business Related Expenses"],
    ],
  },
  {
    key: "housing",
    title: "Housing Expenses",
    subtotalLabel: "Sub Total",
    otherArrayName: "otherHousingExpenses",
    rows: [
      ["housingRent", "Rent"],
      ["housingHeatGas", "Heat / Gas"],
      ["housingPropane", "Propane"],
      ["housingTelephone", "Telephone"],
      ["housingPower", "Power"],
      ["housingCable", "Cable"],
      ["housingWater", "Water"],
      ["housingFurniture", "Furniture"],
      ["housingHouseholdMaintenance", "Household Maintenance"],
    ],
  },
  {
    key: "personal",
    title: "Personal Expenses",
    subtotalLabel: "Sub Total",
    otherArrayName: "otherPersonalExpenses",
    rows: [
      ["personalSmoking", "Smoking"],
      ["personalAlcohol", "Alcohol"],
      ["personalDining", "Dining/Lunches/Restaurant"],
      ["personalEntertainment", "Entertainment/Sports"],
      ["personalGifts", "Gifts/Charitable Expense"],
      ["personalAllowance", "Allowance"],
      ["personalNewspaperMagazine", "Newspaper/Magazine"],
      ["personalChildClothesShoes", "For His Child's Clothes and Shoes"],
    ],
  },
  {
    key: "medical",
    title: "Medical Expenses",
    subtotalLabel: "Sub Total",
    otherArrayName: "otherMedicalExpenses",
    rows: [
      ["medicalPrescriptions", "Prescriptions"],
      ["medicalDental", "Dental"],
    ],
  },
  {
    key: "living",
    title: "Living Expenses",
    subtotalLabel: "Sub Total",
    otherArrayName: "otherLivingExpenses",
    rows: [
      ["livingFoodGrocery", "Food/Grocery"],
      ["livingLaundryDryCleaning", "Laundry/Dry Cleaning"],
      ["livingGroomingToiletries", "Grooming/Toiletries"],
      ["livingClothing", "Clothing"],
    ],
  },
  {
    key: "transportation",
    title: "Transportation Expenses",
    subtotalLabel: "Sub Total",
    otherArrayName: "otherTransportationExpenses",
    rows: [
      ["transportationCarLeaseFinance", "Car Lease/Finance Payments"],
      ["transportationRepairMaintenanceGas", "Repair/Maintenance/Gas"],
      ["transportationRepairMaintenance", "Repair/Maintenance"],
    ],
  },
  {
    key: "insurance",
    title: "Insurance Expenses",
    subtotalLabel: "Sub Total",
    otherArrayName: "otherInsuranceExpenses",
    rows: [
      ["insuranceVehicle", "Vehicle"],
      ["insuranceHouse", "House"],
      ["insuranceFurnitureContents", "Furniture/Contents"],
      ["insuranceLife", "Life Insurance"],
    ],
  },
  {
    key: "payments",
    title: "Payments",
    subtotalLabel: "Sub Total",
    otherArrayName: "otherPaymentsExpenses",
    rows: [
      ["paymentsCP", "CP Payments"],
      ["paymentsChurchDonation", "Church Donation (Tithe)"],
      ["paymentsSettlementOnAssets", "Settlement on Assets"],
      ["paymentsToSecuredPayments", "To Secured Payments"],
    ],
  },
];

const EXPENSE_OTHER_FIELD_LABELS = {
  otherDescription: "Description",
  otherAmount: "Amount",
};

const EXPENSE_SUMMARY_FIELD_LABELS = {
  allExpensesTotal: "All Expenses Total",
  incomeTotal: "Income Total",
  surplusDeficit: "Surplus/Deficit",
};

window.FieldLabels = {
  PERSONAL_FIELD_LABELS: {
    agentName: "Agent Name",
    firstName: "First Name",
    middleName: "Middle Name",
    lastName: "Last Name",
    aliasFirstName: "Alias First Name",
    aliasLastName: "Alias Last Name",
    dateOfBirth: "Date of Birth",
    sinNumber: "SIN Number",
    sex: "Sex",
    highestEducation: "Highest Level of Education",
    mobileNo: "Mobile No",
    email: "Email",
    address: "Address",
    city: "City",
    province: "Province",
    postalCode: "Postal Code",
    maritalStatus: "Marital Status",
    maritalStatusChangeDate: "Marital Status Change Date",
    numberOfDependents: "Number of Dependents",
    spouseName: "Spouse Name",
    childTaxBenefit: "Receiving Child Tax Benefit",
    ctbAmount: "CTB Amount",
    reasonFinancialDifficulties: "Reason of Financial Difficulties",
    bankruptcyFirstName: "Bankruptcy First Name",
    bankruptcyMiddleName: "Bankruptcy Middle Name",
    bankruptcyLastName: "Bankruptcy Last Name",
    bankruptcyAliasFirstName: "Bankruptcy Alias First Name",
    bankruptcyAliasLastName: "Bankruptcy Alias Last Name",
    bankruptcyDateOfBirth: "Bankruptcy Date of Birth",
  },

  EMPLOYMENT_CATEGORY_LABELS: {
    employment: "Employment",
    unemployment: "Unemployment",
    retired: "Retired",
    disabled: "Disabled",
    selfEmployed: "Self-Employed",
    benefits: "Benefits",
  },

  EMPLOYMENT_FIELD_LABELS: {
    employerName: "Employer Name",
    jobTitle: "Job Title",
    employmentType: "Type of Employment",
    dateOfJoining: "Date of Joining",
    lastDayOfWork: "Last Day of Work",
    retirementDate: "Retirement Date",
    pensionSource: "Pension Source",
    disabilityStartDate: "Disability Start Date",
    disabilityType: "Disability Type",
    businessName: "Business Name",
    businessType: "Business Type",
    operationsType: "Operations Type",
    businessAddress: "Business Address",
    businessStartDate: "Business Start Date",
    businessEndDate: "Business End Date",
    numberOfEmployees: "Number of Employees",
    ownershipPercentage: "Ownership Percentage",
    naicsCode: "NAICS Code",
    benefitType: "Benefit Type",
    benefitStartDate: "Benefit Start Date",
  },

  ASSET_CATEGORY_LABELS: {
    properties: "Properties",
    vehicles: "Vehicles",
    policies: "Policies",
    securities: "Securities",
    otherAssets: "Other Assets",
  },

  ASSET_FIELD_LABELS: {
    propertyType: "Property Type",
    houseAddress: "Address",
    numberOnTitle: "Number of People on Title",
    propertyValue: "Property Value",
    houseMortgage: "Mortgage",
    residenceType: "Residence",
    houseMortgageProvider: "Mortgage Provider Name",
    mobileHomeName: "Name of Mobile Home",
    mobileHomeValue: "Value",
    mobileHomeMortgage: "Mortgage",
    mobileHomeMortgageProvider: "Mortgage Provider Name",
    mobileHomeSupportingDoc: "Supporting Doc for Value",
    trailerName: "Name of Trailer",
    trailerValue: "Value",
    trailerMortgage: "Mortgage",
    trailerMortgageProvider: "Mortgage Provider Name",
    trailerSupportingDoc: "Supporting Doc for Value",

    vehicleType: "Vehicle Type",
    vehicleYear: "Year",
    vehicleMake: "Make",
    vehicleModel: "Model",
    vehicleVIN: "VIN",
    vehicleMileage: "Mileage",
    vehicleCreditorName: "Creditor Name (if leased or loaned)",
    vehicleValue: "Vehicle Value",
    vehicleLoanValue: "Loan Value",

    policyType: "Policy Type",
    rrspProviderName: "Policy Provider Name",
    rrspTotalMarketValue: "Total Market Value",
    rrspLast12MonthContributions: "Last 12 Month Contributions",
    dpspProviderName: "Policy Provider Name",
    dpspTotalMarketValue: "Total Market Value",
    dpspLast12MonthContributions: "Last 12 Month Contributions",
    respProviderName: "Policy Provider Name",
    respTotalMarketValue: "Total Market Value",
    lifeInsuranceProviderName: "Policy Provider Name",
    lifeInsuranceValue: "Value",
    lifeInsuranceCashSurrenderValue: "Cash Surrender Value",
    otherPolicyName: "Policy Name",
    otherPolicyProviderName: "Policy Provider Name",
    otherPolicyTotalMarketValue: "Total Market Value",

    securityType: "Security Type",
    securityIssuerName: "Issuer Name",
    securityTotalMarketValue: "Total Market Value",

    otherAssetDescription: "Description",
    otherAssetValue: "Value",
    otherAssetLoanValue: "Loan Value",
    otherAssetCreditorName: "Creditor Name",
  },

  BANKRUPTCY_EQUITY_FIELD_LABELS: {
    bankruptcyEquityAssetDescription: "Asset Description",
    bankruptcyEquityAssetsValue: "Assets Value",
  },

  LIABILITY_CATEGORY_LABELS: {
    liabilities: "Liabilities",
  },

  LIABILITY_FIELD_LABELS: {
    creditorName: "Creditor Name",
    creditorNameOther: "Creditor Name (Other)",
    liabilityDetail: "Liability Detail",
    ownershipType: "Type of Ownership",
    debtType: "Type of Debt",
    debtTypeDescription: "Description",
    debtSecurityType: "Type",
    securedAgainst: "Secured Against",
    debtAmount: "Debt Amount",
  },

  QUESTIONNAIRE_FIELD_LABELS: {
    soldTransferredProperty: "Sold/Transferred Property (Last 5 Years)",
    soldTransferredPropertyDetails: "Sold/Transferred Property - Details",
    propertySeizedRepossessed: "Property Seized/Repossessed",
    propertySeizedRepossessedDetails: "Property Seized/Repossessed - Details",
    expectLargeFunds: "Expect Large Funds (Next 12 Months)",
    expectLargeFundsDetails: "Expect Large Funds - Details",
    giftsOverFiveHundred: "Gifts Over $500 (Last 12 Months)",
    giftsOverFiveHundredDetails: "Gifts Over $500 - Details",
  },

  INCOME_FIELD_LABELS,

  EXPENSE_SECTIONS,
  EXPENSE_OTHER_FIELD_LABELS,
  EXPENSE_SUMMARY_FIELD_LABELS,

  INCOME_CALC_CATEGORY_LABELS: {
    employed: "Employed",
    unemployed: "Unemployed",
    retired: "Retired",
    disabled: "Disabled",
    selfEmployed: "Self-Employed",
    benefits: "Benefits",
  },

  INCOME_CALC_EMPLOYED_FIELD_LABELS: {
    paymentFrequency: "Payment Frequency",
    netIncome: "Net Income",
    totalIncome: "Total Income",
  },

  INCOME_CALC_DEDUCTION_FIELD_LABELS: {
    description: "Description",
    amount: "Amount",
  },

  INCOME_CALC_UNEMPLOYED_FIELD_LABELS: {
    receivingEI: "Receiving EI",
    eiAmount: "EI Amount",
    receivingFinancialAssistance: "Receiving Financial Assistance",
    financialAssistanceProvider: "Financial Assistance Provider",
    receivingOtherBenefits: "Receiving Other Benefits",
    otherBenefitName: "Other Benefit Name",
    otherBenefitAmount: "Other Benefit Amount",
  },

  INCOME_CALC_PENSION_FIELD_LABELS: {
    pensionType: "Type of Pension",
    monthlyIncome: "Monthly Income",
  },

  INCOME_CALC_DISABLED_FIELD_LABELS: {
    disabilityMonthlyIncome: "Disability Monthly Income",
  },

  INCOME_CALC_SELF_EMPLOYED_FIELD_LABELS: {
    selfEmploymentMonthlyIncome: "Self Employment Monthly Income",
  },

  INCOME_CALC_BENEFITS_FIELD_LABELS: {
    benefitsMonthlyIncome: "Benefits Monthly Income",
  },

  INCOME_CALC_TOTALS_LABELS: {
    debtorEmploymentIncome: "Debtor - Total Employment Income",
    debtorEI: "Debtor - Total EI",
    debtorOtherBenefits: "Debtor - Total Other Benefits",
    debtorPension: "Debtor - Total Pension",
    debtorDisability: "Debtor - Total Disability",
    debtorSelfEmployment: "Debtor - Total Self Employment",
    debtorBenefits: "Debtor - Total Benefits",
    spouseEmploymentIncome: "Spouse - Total Employment Income",
    spouseEI: "Spouse - Total EI",
    spouseOtherBenefits: "Spouse - Total Other Benefits",
    spousePension: "Spouse - Total Pension",
    spouseBenefits: "Spouse - Total Benefits",
  },

  SOM_FIELD_LABELS: {
    numberOfAdults: "Number of Adults in Family",
    numberOfDependents: "Number of Dependents in Family",
    spouseEarningIncome: "Spouse Earning Income",
    spouseIncome: "Spouse Income",
    receivingChildSupport: "Receiving Child Support",
    childSupportAmount: "Child Support Amount",
    receivingSpousalSupport: "Receiving Spousal Support",
    spousalSupportAmount: "Spousal Support Amount",
  },

  SOM_OTHER_ADULT_FIELD_LABELS: {
    description: "Description",
    earningIncome: "Earning Income",
    income: "Income",
  },
};
