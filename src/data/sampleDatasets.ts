import type { SampleDatasetOption } from '../types/dataset'

export const SAMPLE_DATASETS: SampleDatasetOption[] = [
  {
    id: 'employee_salaries',
    name: 'Tech Employees & Compensation',
    description: 'Demographics, roles, salaries, ratings, and missing values across departments.',
    csvContent: `employee_id,full_name,department,role,salary,experience_years,remote,performance_rating,joined_date
101,Aria Montgomery,Engineering,Frontend Engineer,115000,4,true,4.5,2022-03-15
102,Marcus Chen,Engineering,Staff Backend Eng,178000,9,true,4.9,2019-07-01
103,Sarah Jenkins,Marketing,Content Strategist,78000,3,false,3.8,2023-01-10
104,Liam O'Connor,Sales,Account Executive,92000,5,false,4.1,2021-09-20
105,Elena Rostova,Data Science,ML Engineer,145000,6,true,4.8,2020-11-12
106,Devon Vance,Product,Product Manager,132000,7,true,4.2,2021-04-05
107,Chloe Bennett,Engineering,DevOps Engineer,128000,5,true,4.4,2022-08-18
108,Zack Snyder,Marketing,Growth Marketer,84000,4,false,3.9,2022-05-30
109,Fatima Al-Sayed,Data Science,Data Analyst,96000,3,true,4.6,2023-02-14
110,Mateo Gomez,Sales,SDR,62000,1,false,3.5,2024-01-15
111,Priya Patel,Engineering,Frontend Engineer,118000,4,true,4.7,2022-02-01
112,Lucas Wright,Product,Associate PM,95000,2,false,4.0,2023-06-15
113,Ananya Sharma,Engineering,Staff Systems Eng,185000,10,true,5.0,2018-09-01
114,Tom Holland,Marketing,,71000,2,false,3.4,2023-08-22
115,Nina Simone,Data Science,Research Scientist,165000,8,true,4.9,2020-03-10
116,Leo Tolstoy,Sales,Sales Manager,125000,8,false,4.3,2020-08-01
117,Grace Hopper,Engineering,Principal Architect,215000,14,true,5.0,2016-01-15
118,James Cameron,Product,VP Product,195000,12,false,4.8,2018-04-12
119,Kylie Minogue,Marketing,Brand Specialist,,3,false,3.7,2023-04-19
120,Sam Altman,Executive,CEO,250000,15,true,5.0,2015-05-01`,
  },
  {
    id: 'retail_sales',
    name: 'E-Commerce Store Orders',
    description: 'Transaction orders, product categories, quantities, unit prices, discounts, and payment methods.',
    csvContent: `order_id,customer_id,order_date,category,product_name,quantity,unit_price,discount_pct,total_amount,payment_method,returned
ORD-1001,CUST-501,2026-01-05,Electronics,Noise-Cancelling Headphones,1,199.99,0.10,179.99,Credit Card,false
ORD-1002,CUST-502,2026-01-05,Furniture,Ergonomic Office Chair,1,289.00,0.00,289.00,PayPal,false
ORD-1003,CUST-503,2026-01-06,Office,Mechanical Keyboard,2,89.50,0.15,152.15,Credit Card,false
ORD-1004,CUST-504,2026-01-07,Electronics,4K USB-C Monitor,1,450.00,0.05,427.50,Bank Transfer,false
ORD-1005,CUST-505,2026-01-08,Electronics,Wireless Mouse,3,29.99,0.00,89.97,Credit Card,false
ORD-1006,CUST-506,2026-01-08,Office,Standing Desk Converter,1,165.00,0.20,132.00,PayPal,true
ORD-1007,CUST-507,2026-01-09,Furniture,Bookshelf Unit,1,119.00,0.00,119.00,Credit Card,false
ORD-1008,CUST-508,2026-01-10,Electronics,Webcam 1080p,2,59.99,0.10,107.98,Apple Pay,false
ORD-1009,CUST-509,2026-01-11,Office,Desk Mat Large,4,19.99,0.05,75.96,Credit Card,false
ORD-1010,CUST-510,2026-01-12,Electronics,USB-C Docking Station,1,149.00,0.15,126.65,PayPal,false
ORD-1011,CUST-511,2026-01-12,Furniture,LED Desk Lamp,2,39.99,0.00,79.98,Apple Pay,false
ORD-1012,CUST-512,2026-01-13,Electronics,Laptop Stand Aluminum,1,49.99,0.10,44.99,Credit Card,false`,
  },
]
