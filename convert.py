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
    'total': 'first',  # Take first total (should be same for all rows of same proposal)
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

