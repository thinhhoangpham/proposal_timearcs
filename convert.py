import pandas as pd

# Read the Excel file
excel_file = 'all 2.xlsx'
df = pd.read_excel(excel_file)

# Function to convert "LastName, FirstName" to "FirstName LastName"
def format_name(name):
    if pd.isna(name):
        return name
    # Split by comma and reverse (if comma exists)
    if ',' in name:
        parts = name.split(',', 1)
        if len(parts) == 2:
            return f"{parts[1].strip()} {parts[0].strip()}"
    return name

# Format PI names to "FirstName LastName" format
df['PI_formatted'] = df['PI'].apply(format_name)

# Check for proposals with different total amounts per author
print("Checking for proposals with different total amounts per author...")
total_check = df.groupby('proposal_no')['total'].agg(['nunique', 'min', 'max', 'count'])
different_totals = total_check[total_check['nunique'] > 1]
if len(different_totals) > 0:
    print(f"WARNING: Found {len(different_totals)} proposals with different total amounts per author:")
    print(different_totals.head(10))
    print("\nUsing 'max' to get the highest total for each proposal.")
    print("If totals should be the same, please check your source data.\n")
    # Use max if totals differ (could also use min or mean)
    total_agg = 'max'
else:
    print("All proposals have consistent total amounts across authors.\n")
    total_agg = 'first'  # If all the same, first is fine

# Group by proposal_no and aggregate
# Combine all PIs into a single Authors column
aggregated = df.groupby('proposal_no').agg({
    'date_submitted': 'first',  # Take first occurrence
    'title': 'first',
    'sponsor': 'first',
    'prime_sponsor': 'first',
    'PI_formatted': lambda x: ','.join(x),  # Combine all PIs with comma separator (no space after comma like in example)
    'credit': 'sum',  # Sum up credits
    'first': 'sum',  # Sum up first amounts
    'total': total_agg,  # Use max if totals differ, first if they're all the same
    'theme': 'first'
}).reset_index()

# Rename PI_formatted column to Authors for clarity
aggregated.rename(columns={'PI_formatted': 'Authors'}, inplace=True)

# Convert to TSV (tab-separated values)
tsv_file = 'data\publication.tsv'
aggregated.to_csv(tsv_file, sep='\t', index=False)

print(f"Successfully converted {excel_file} to {tsv_file}")
print(f"Original rows: {len(df)}")
print(f"Consolidated rows: {len(aggregated)}")
print(f"Number of columns: {len(aggregated.columns)}")
print(f"\nColumn names:")
print(aggregated.columns.tolist())
print(f"\nSample of first 3 rows:")
print(aggregated.head(3).to_string())

