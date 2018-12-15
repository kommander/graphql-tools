/* eslint-disable complexity */
import {
  GraphQLNamedType,
  GraphQLField,
  GraphQLSchema,
  isNamedType,
  GraphQLObjectType
}  from 'graphql';

export type ConflictInfo = {
  left: {
    schema: GraphQLSchema;
    type: GraphQLNamedType;
  };
  right: {
    schema: GraphQLSchema;
    type: GraphQLNamedType;
  };
};

export type OnTypeConflict = (
  left: GraphQLNamedType,
  right: GraphQLNamedType,
  info: ConflictInfo,
) => void;

export type OnFieldConflict = (
  fieldName: String,
  left: GraphQLField<any, any>,
  right: GraphQLField<any, any>,
  info: ConflictInfo,
) => void;

export function findTypeConflict(schemas: Array<GraphQLSchema>, {
  onTypeConflict = () => {},
  ignoreTypeCheck = [],
  onFieldConflict = () => {},
  ignoreFieldCheck = [],
}: {
  onTypeConflict: OnTypeConflict,
  ignoreTypeCheck: Array<String>,
  onFieldConflict: OnFieldConflict,
  ignoreFieldCheck: Array<String>,
}): void {
  schemas.reduce((left, right) => {
    const typeMap = right.getTypeMap();

    Object.keys(typeMap)
      .filter(typeName => !/^__/.test(typeName))
      .forEach(typeName => {
        if (!isNamedType(typeMap[typeName])) {
          return;
        }

        const type: GraphQLNamedType = typeMap[typeName];
        const ref = { type, typeName, schema: right };

        if (left[typeName]) {
          const info: ConflictInfo = {
            left: {
              schema: left[typeName].schema,
              type: left[typeName].type,
            },
            right: {
              schema: right,
              type,
            },
          };

          if (!ignoreTypeCheck.includes(typeName)) {
            onTypeConflict(
              left[typeName].type,
              type,
              info
            );
          }

          if (type instanceof GraphQLObjectType && !ignoreFieldCheck.includes(typeName)) {
            const leftFields = left[typeName].type.getFields();
            const rightFields = type.getFields();
            const leftFieldKeys = Object.keys(leftFields);
            const rightFieldKeys = Object.keys(rightFields);

            rightFieldKeys.forEach(fieldName => {
              if (leftFieldKeys.includes(fieldName)) {
                onFieldConflict(
                  fieldName,
                  leftFields[fieldName],
                  rightFields[fieldName],
                  info
                );
              }
            });
          }
        }

        Object.assign(left, {
          [typeName]: ref,
        });
      });

      return left;
  }, {});
};
