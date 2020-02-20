#/bin/bash
HASH_KEY="kind"
SORT_KEY="title"
aws dynamodb create-table --table-name $1 \
    --attribute-definitions AttributeName=$HASH_KEY,AttributeType=S AttributeName=$SORT_KEY,AttributeType=S \
    --key-schema AttributeName=$HASH_KEY,KeyType=HASH AttributeName=$SORT_KEY,KeyType=RANGE \
    --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
    --region eu-west-1 \
    --query TableDescription.TableArn --output text

# Wait for table to exist
aws dynamodb wait table-exists --table-name $1

# Sample data
for file in ./sampleData/*.json; do
    aws dynamodb put-item --table-name $1 --item file://$file
done
